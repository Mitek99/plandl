import { DEFAULT_WALLS, FURNITURE_DEPTHS } from "./defaults.js";
import type {
  Diagnostic,
  PlanDocument,
  Point,
  ResolvedFurniture,
  ResolvedGrid,
  ResolvedOpening,
  ResolvedPlan,
  ResolvedRoom,
  ResolvedWall,
  Scalar,
  SourceLocation,
  WallDefaults,
  WallSide
} from "./types.js";

const EPSILON = 1e-7;

function report(
  diagnostics: Diagnostic[],
  code: string,
  message: string,
  location?: SourceLocation
): void {
  diagnostics.push({ code, message, severity: "error", location });
}

function length(
  scalar: Scalar,
  label: string,
  diagnostics: Diagnostic[],
  allowZero = false
): number {
  if (scalar.unit === "sqm") {
    report(diagnostics, "INVALID_UNIT", `${label} must be a length, not an area.`, scalar.location);
    return 0;
  }
  const multiplier = scalar.unit === "m" ? 1000 : scalar.unit === "cm" ? 10 : 1;
  const value = scalar.value * multiplier;
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    report(diagnostics, "INVALID_LENGTH", `${label} must be ${allowZero ? "zero or greater" : "greater than zero"}.`, scalar.location);
    return 0;
  }
  return value;
}

function gridIndex(scalar: Scalar, maximum: number, label: string, diagnostics: Diagnostic[]): number {
  if (scalar.unit !== undefined || !Number.isInteger(scalar.value) || scalar.value < 0 || scalar.value > maximum) {
    report(diagnostics, "INVALID_GRID_INDEX", `${label} must be a unitless integer from 0 to ${maximum}.`, scalar.location);
    return 0;
  }
  return scalar.value;
}

/**
 * Resolves GRID LINES_X or LINES_Y into coordinates, starting with the implicit line at 0.
 * Each entry is absolute (3m), measured from the previous line (+3m), or measured back
 * from the next line (-3m). A run of "-" entries is anchored by the first non-"-" entry after it.
 */
function gridLines(entries: Scalar[], field: string, diagnostics: Diagnostic[]): number[] {
  const kinds = entries.map((entry) => entry.sign ?? "absolute");
  const amounts = entries.map((entry, index) => {
    const label = `${field}[${index}] (${entry.raw})`;
    return kinds[index] === "absolute"
      ? length(entry, label, diagnostics, true)
      : length({ ...entry, value: Math.abs(entry.value) }, label, diagnostics);
  });
  const lines: Array<number | undefined> = entries.map(() => undefined);
  // Forward pass: absolute lines and "+" lines whose previous line is known.
  for (let index = 0; index < entries.length; index += 1) {
    const previous = index === 0 ? 0 : lines[index - 1];
    if (kinds[index] === "absolute") lines[index] = amounts[index];
    else if (kinds[index] === "+" && previous !== undefined) lines[index] = previous + amounts[index]!;
  }
  // Backward pass: "-" lines whose next line is known. A "-" followed by "+" stays unresolved:
  // each would be measured from the other.
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const next = lines[index + 1];
    if (kinds[index] === "-" && next !== undefined) lines[index] = next - amounts[index]!;
  }

  const result = [0];
  let reported = false;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    const previous = result[result.length - 1]!;
    let line = lines[index];
    if (line === undefined) {
      if (!reported) {
        const reason = index === entries.length - 1
          ? "it is the last line, so there is no next line to measure from"
          : "the next line is itself relative to this one";
        report(
          diagnostics,
          "UNRESOLVED_GRID_LINE",
          `${field}[${index}] (${entry.raw}) is measured back from the next line, but ${reason}. Follow a -X entry with an absolute line or another -X entry.`,
          entry.location
        );
        reported = true;
      }
      line = previous + 1;
    } else if (!reported && line <= previous) {
      report(
        diagnostics,
        "GRID_LINES_NOT_INCREASING",
        `${field}[${index}] (${entry.raw}) resolves to ${line}mm, which is not after the previous line at ${previous}mm. Grid lines must increase, and the grid always starts with a line at 0.`,
        entry.location
      );
      reported = true;
      line = previous + 1;
    }
    result.push(line);
  }
  return result;
}

function overlaps(a: ResolvedRoom, b: ResolvedRoom): boolean {
  return Math.min(a.x[1], b.x[1]) > Math.max(a.x[0], b.x[0])
    && Math.min(a.y[1], b.y[1]) > Math.max(a.y[0], b.y[0]);
}

function wallPolygon(wall: ResolvedWall): Point[] {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy);
  const along = { x: dx / length, y: dy / length };
  const left = { x: -along.y, y: along.x };
  const shift = (point: Point, amount: number): Point => ({ x: point.x + left.x * amount, y: point.y + left.y * amount });
  if (wall.type === "OUTER") {
    const interiorAmount = wall.interiorSide === "LEFT" ? wall.inside : -wall.inside;
    const exteriorAmount = wall.interiorSide === "LEFT" ? -wall.outside : wall.outside;
    return [
      shift(wall.start, interiorAmount),
      shift(wall.end, interiorAmount),
      shift(wall.end, exteriorAmount),
      shift(wall.start, exteriorAmount)
    ];
  }
  const half = wall.thickness / 2;
  return [shift(wall.start, half), shift(wall.end, half), shift(wall.end, -half), shift(wall.start, -half)];
}

export function wallPoints(wall: ResolvedWall): Point[] {
  return wallPolygon(wall);
}

interface WallSegment {
  start: number;
  end: number;
  fixed: number;
  centerFixed: number;
  room: ResolvedRoom;
  availableDepth: number;
}

export function resolvePlan(document: PlanDocument, parseDiagnostics: Diagnostic[] = []): ResolvedPlan {
  const diagnostics = [...parseDiagnostics];
  const defaults: WallDefaults = { ...DEFAULT_WALLS };
  const plan: ResolvedPlan = {
    defaults,
    rooms: [],
    terraces: [],
    walls: [],
    furniture: [],
    openings: [],
    diagnostics
  };

  const gridDefinitions = document.definitions.filter((definition) => definition.kind === "grid");
  if (document.definitions[0]?.kind !== "grid") {
    report(diagnostics, "GRID_FIRST", "A plan must start with a GRID definition.", document.definitions[0]?.location);
  }
  if (gridDefinitions.length === 0) {
    report(diagnostics, "MISSING_GRID", "A plan requires exactly one GRID definition.");
    return plan;
  }
  if (gridDefinitions.length > 1) {
    for (const duplicate of gridDefinitions.slice(1)) {
      report(diagnostics, "DUPLICATE_GRID", "A plan may contain only one GRID definition.", duplicate.location);
    }
  }

  let sawDefault = false;
  for (const definition of document.definitions) {
    if (definition.kind !== "default") continue;
    if (sawDefault) report(diagnostics, "DUPLICATE_DEFAULT", "DEFAULT may appear only once.", definition.location);
    sawDefault = true;
    if (definition.innerThickness) defaults.innerThickness = length(definition.innerThickness, "INNER_THICKNESS", diagnostics);
    if (definition.bearingThickness) defaults.bearingThickness = length(definition.bearingThickness, "BEARING_THICKNESS", diagnostics);
    if (definition.outerThickness) defaults.outerThickness = length(definition.outerThickness, "OUTER_THICKNESS", diagnostics);
  }
  const maximumInside = Math.max(defaults.innerThickness, defaults.bearingThickness) / 2;
  if (defaults.outerThickness < maximumInside) {
    report(diagnostics, "INVALID_OUTER_THICKNESS", "OUTER_THICKNESS must be at least half of the inner or bearing thickness.", gridDefinitions[0]!.location);
  }

  const gridDefinition = gridDefinitions[0]!;
  const x = gridLines(gridDefinition.linesX, "LINES_X", diagnostics);
  const y = gridLines(gridDefinition.linesY, "LINES_Y", diagnostics);
  const countX = x.length - 1;
  const countY = y.length - 1;
  const bearingX = new Set<number>();
  const bearingY = new Set<number>();
  for (const definition of document.definitions) {
    if (definition.kind !== "bearing") continue;
    for (const entry of definition.x) bearingX.add(gridIndex(entry, countX, "BEARING X index", diagnostics));
    for (const entry of definition.y) bearingY.add(gridIndex(entry, countY, "BEARING Y index", diagnostics));
  }

  const insideAt = (axis: "X" | "Y", index: number): number => {
    const bearing = axis === "X" ? bearingX.has(index) : bearingY.has(index);
    return (bearing ? defaults.bearingThickness : defaults.innerThickness) / 2;
  };
  const outsideAt = (axis: "X" | "Y", index: number): number => defaults.outerThickness - insideAt(axis, index);
  const minX = -outsideAt("X", 0);
  const maxX = x[x.length - 1]! + outsideAt("X", countX);
  const minY = -outsideAt("Y", 0);
  const maxY = y[y.length - 1]! + outsideAt("Y", countY);
  const outerDimensions: [number, number] = [maxX - minX, maxY - minY];
  const grid: ResolvedGrid = {
    x,
    y,
    outerDimensions,
    outerArea: outerDimensions[0] * outerDimensions[1],
    perimeter: 2 * (outerDimensions[0] + outerDimensions[1]),
    location: gridDefinition.location
  };
  plan.grid = grid;

  const spaces: ResolvedRoom[] = [];
  const spaceByName = new Map<string, ResolvedRoom>();
  for (const definition of document.definitions) {
    if (definition.kind !== "room" && definition.kind !== "terrace") continue;
    if (spaceByName.has(definition.name)) {
      report(diagnostics, "DUPLICATE_ROOM", `Duplicate room or terrace name: ${definition.name}.`, definition.location);
      continue;
    }
    const xRange: [number, number] = [
      gridIndex(definition.x[0], countX, `${definition.name} X start`, diagnostics),
      gridIndex(definition.x[1], countX, `${definition.name} X end`, diagnostics)
    ];
    const yRange: [number, number] = [
      gridIndex(definition.y[0], countY, `${definition.name} Y start`, diagnostics),
      gridIndex(definition.y[1], countY, `${definition.name} Y end`, diagnostics)
    ];
    if (xRange[0] >= xRange[1] || yRange[0] >= yRange[1]) {
      report(diagnostics, "INVALID_ROOM_RANGE", `${definition.name} must select a nonempty grid rectangle.`, definition.location);
      continue;
    }
    const room: ResolvedRoom = {
      name: definition.name,
      type: definition.kind === "room" ? "ROOM" : "TERRACE",
      x: xRange,
      y: yRange,
      bounds: { minX: x[xRange[0]]!, maxX: x[xRange[1]]!, minY: y[yRange[0]]!, maxY: y[yRange[1]]! },
      merge: [...definition.merge],
      compound: definition.name,
      area: 0,
      location: definition.location
    };
    spaces.push(room);
    spaceByName.set(room.name, room);
    (room.type === "ROOM" ? plan.rooms : plan.terraces).push(room);
  }

  for (let index = 0; index < spaces.length; index += 1) {
    for (let other = index + 1; other < spaces.length; other += 1) {
      if (overlaps(spaces[index]!, spaces[other]!)) {
        report(diagnostics, "ROOM_OVERLAP", `${spaces[index]!.name} and ${spaces[other]!.name} overlap.`, spaces[other]!.location);
      }
    }
  }

  const parentByChild = new Map<string, string>();
  const childrenByParent = new Map<string, string[]>();
  for (const room of spaces) {
    const seen = new Set<string>();
    for (const childName of room.merge) {
      if (seen.has(childName)) {
        report(diagnostics, "DUPLICATE_MERGE", `${room.name} merges ${childName} more than once.`, room.location);
        continue;
      }
      seen.add(childName);
      const child = spaceByName.get(childName);
      if (!child) {
        report(diagnostics, "UNKNOWN_MERGE", `${room.name} merges unknown room ${childName}.`, room.location);
        continue;
      }
      if (child.name === room.name) {
        report(diagnostics, "SELF_MERGE", `${room.name} cannot merge itself.`, room.location);
        continue;
      }
      if (child.type !== room.type) {
        report(diagnostics, "INVALID_MERGE_TYPE", `${room.name} and ${child.name} must both be rooms or both be terraces.`, room.location);
        continue;
      }
      const previousParent = parentByChild.get(childName);
      if (previousParent && previousParent !== room.name) {
        report(diagnostics, "MULTIPLE_MERGE_PARENTS", `${childName} is already merged by ${previousParent}.`, room.location);
        continue;
      }
      parentByChild.set(childName, room.name);
      const children = childrenByParent.get(room.name) ?? [];
      children.push(childName);
      childrenByParent.set(room.name, children);
    }
  }

  const rootCache = new Map<string, string>();
  const cyclic = new Set<string>();
  const rootFor = (name: string, trail: string[] = []): string => {
    const cached = rootCache.get(name);
    if (cached) return cached;
    const cycleStart = trail.indexOf(name);
    if (cycleStart >= 0) {
      for (const cyclicName of trail.slice(cycleStart)) cyclic.add(cyclicName);
      return name;
    }
    const parent = parentByChild.get(name);
    const root = parent ? rootFor(parent, [...trail, name]) : name;
    rootCache.set(name, root);
    return root;
  };
  for (const room of spaces) room.compound = rootFor(room.name);
  for (const name of cyclic) {
    const room = spaceByName.get(name);
    if (room) report(diagnostics, "MERGE_CYCLE", `Room merge cycle includes ${name}.`, room.location);
  }

  const spaceAtCell = (xIndex: number, yIndex: number): ResolvedRoom | undefined => {
    if (xIndex < 0 || yIndex < 0 || xIndex >= countX || yIndex >= countY) return undefined;
    return spaces.find((room) => room.x[0] <= xIndex && room.x[1] > xIndex && room.y[0] <= yIndex && room.y[1] > yIndex);
  };
  const sameCompound = (a: ResolvedRoom | undefined, b: ResolvedRoom | undefined): boolean => Boolean(a && b && a.compound === b.compound);
  const ownAreas = new Map<string, number>();
  const invalidInterior = new Set<string>();

  for (const room of spaces) {
    let area = 0;
    for (let xIndex = room.x[0]; xIndex < room.x[1]; xIndex += 1) {
      for (let yIndex = room.y[0]; yIndex < room.y[1]; yIndex += 1) {
        const leftOpen = sameCompound(room, spaceAtCell(xIndex - 1, yIndex));
        const rightOpen = sameCompound(room, spaceAtCell(xIndex + 1, yIndex));
        const southOpen = sameCompound(room, spaceAtCell(xIndex, yIndex - 1));
        const northOpen = sameCompound(room, spaceAtCell(xIndex, yIndex + 1));
        const inset = (open: boolean, amount: number): number => room.type === "TERRACE" || open ? 0 : amount;
        const width = x[xIndex + 1]! - x[xIndex]!
          - inset(leftOpen, insideAt("X", xIndex)) - inset(rightOpen, insideAt("X", xIndex + 1));
        const depth = y[yIndex + 1]! - y[yIndex]!
          - inset(southOpen, insideAt("Y", yIndex)) - inset(northOpen, insideAt("Y", yIndex + 1));
        if (width <= 0 || depth <= 0) {
          if (!invalidInterior.has(room.name)) {
            report(diagnostics, "INVALID_ROOM_INTERIOR", `${room.name} has no positive interior dimensions after wall thickness is applied.`, room.location);
            invalidInterior.add(room.name);
          }
        } else {
          area += width * depth;
        }
      }
    }
    ownAreas.set(room.name, area);

    if (room.merge.length === 0) {
      const sideFullyOpen = (side: WallSide): boolean => {
        if (side === "WEST" || side === "EAST") {
          const xIndex = side === "WEST" ? room.x[0] - 1 : room.x[1];
          for (let yIndex = room.y[0]; yIndex < room.y[1]; yIndex += 1) {
            if (!sameCompound(room, spaceAtCell(xIndex, yIndex))) return false;
          }
        } else {
          const yIndex = side === "SOUTH" ? room.y[0] - 1 : room.y[1];
          for (let xIndex = room.x[0]; xIndex < room.x[1]; xIndex += 1) {
            if (!sameCompound(room, spaceAtCell(xIndex, yIndex))) return false;
          }
        }
        return true;
      };
      const west = sideFullyOpen("WEST") ? 0 : insideAt("X", room.x[0]);
      const east = sideFullyOpen("EAST") ? 0 : insideAt("X", room.x[1]);
      const south = sideFullyOpen("SOUTH") ? 0 : insideAt("Y", room.y[0]);
      const north = sideFullyOpen("NORTH") ? 0 : insideAt("Y", room.y[1]);
      room.innerDimensions = room.type === "TERRACE"
        ? [room.bounds.maxX - room.bounds.minX, room.bounds.maxY - room.bounds.minY]
        : [room.bounds.maxX - room.bounds.minX - west - east, room.bounds.maxY - room.bounds.minY - south - north];
    }
  }

  const aggregateArea = (name: string, visited = new Set<string>()): number => {
    if (visited.has(name)) return 0;
    visited.add(name);
    let area = ownAreas.get(name) ?? 0;
    for (const child of childrenByParent.get(name) ?? []) area += aggregateArea(child, visited);
    return area;
  };
  for (const room of spaces) room.area = aggregateArea(room.name);

  const makeWall = (
    a: ResolvedRoom | undefined,
    b: ResolvedRoom | undefined,
    start: Point,
    end: Point,
    bearing: boolean,
    interiorSide?: "LEFT" | "RIGHT"
  ): ResolvedWall | null => {
    if (!a && !b) return null;
    if (sameCompound(a, b)) return null;
    const rooms = [a?.name, b?.name].filter((name): name is string => name !== undefined);
    const aRoom = a?.type === "ROOM";
    const bRoom = b?.type === "ROOM";
    const type = aRoom && bRoom ? "INNER" : aRoom || bRoom ? "OUTER" : "TERRACE";
    const thickness = type === "INNER"
      ? bearing ? defaults.bearingThickness : defaults.innerThickness
      : type === "OUTER" ? defaults.outerThickness : 0;
    const inside = type === "OUTER" ? (bearing ? defaults.bearingThickness : defaults.innerThickness) / 2 : thickness / 2;
    return {
      start,
      end,
      type,
      bearing,
      thickness,
      inside,
      outside: type === "OUTER" ? thickness - inside : thickness / 2,
      interiorSide: type === "OUTER" ? interiorSide : undefined,
      rooms
    };
  };

  for (let xIndex = 0; xIndex <= countX; xIndex += 1) {
    for (let yIndex = 0; yIndex < countY; yIndex += 1) {
      const west = spaceAtCell(xIndex - 1, yIndex);
      const east = spaceAtCell(xIndex, yIndex);
      const interiorSide = west?.type === "ROOM" ? "LEFT" : east?.type === "ROOM" ? "RIGHT" : undefined;
      const wall = makeWall(
        west,
        east,
        { x: x[xIndex]!, y: y[yIndex]! },
        { x: x[xIndex]!, y: y[yIndex + 1]! },
        bearingX.has(xIndex),
        interiorSide
      );
      if (wall) plan.walls.push(wall);
    }
  }
  for (let yIndex = 0; yIndex <= countY; yIndex += 1) {
    for (let xIndex = 0; xIndex < countX; xIndex += 1) {
      const south = spaceAtCell(xIndex, yIndex - 1);
      const north = spaceAtCell(xIndex, yIndex);
      const interiorSide = north?.type === "ROOM" ? "LEFT" : south?.type === "ROOM" ? "RIGHT" : undefined;
      const wall = makeWall(
        south,
        north,
        { x: x[xIndex]!, y: y[yIndex]! },
        { x: x[xIndex + 1]!, y: y[yIndex]! },
        bearingY.has(yIndex),
        interiorSide
      );
      if (wall) plan.walls.push(wall);
    }
  }

  const descendants = (name: string): ResolvedRoom[] => {
    const root = spaceByName.get(name);
    if (!root) return [];
    const members = new Set<string>([name]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const room of spaces) {
        if (members.has(room.name)) continue;
        const parent = parentByChild.get(room.name);
        if (parent && members.has(parent)) {
          members.add(room.name);
          changed = true;
        }
      }
    }
    return spaces.filter((room) => members.has(room.name));
  };

  const segmentsFor = (members: ResolvedRoom[], side: WallSide): WallSegment[] => {
    const segments: WallSegment[] = [];
    const inset = (room: ResolvedRoom, open: boolean, amount: number): number => room.type === "TERRACE" || open ? 0 : amount;
    const push = (segment: WallSegment): void => {
      const previous = segments[segments.length - 1];
      if (previous && previous.room.name === segment.room.name
        && Math.abs(previous.end - segment.start) <= EPSILON
        && Math.abs(previous.fixed - segment.fixed) <= EPSILON
        && Math.abs(previous.centerFixed - segment.centerFixed) <= EPSILON) {
        previous.end = segment.end;
        previous.availableDepth = Math.min(previous.availableDepth, segment.availableDepth);
      } else {
        segments.push(segment);
      }
    };
    for (const room of members) {
      if (side === "SOUTH" || side === "NORTH") {
        const yIndex = side === "SOUTH" ? room.y[0] : room.y[1] - 1;
        const neighborY = side === "SOUTH" ? yIndex - 1 : yIndex + 1;
        for (let xIndex = room.x[0]; xIndex < room.x[1]; xIndex += 1) {
          if (sameCompound(room, spaceAtCell(xIndex, neighborY))) continue;
          const westOpen = sameCompound(room, spaceAtCell(xIndex - 1, yIndex));
          const eastOpen = sameCompound(room, spaceAtCell(xIndex + 1, yIndex));
          const southOpen = sameCompound(room, spaceAtCell(xIndex, room.y[0] - 1));
          const northOpen = sameCompound(room, spaceAtCell(xIndex, room.y[1]));
          const west = inset(room, westOpen, insideAt("X", xIndex));
          const east = inset(room, eastOpen, insideAt("X", xIndex + 1));
          const south = inset(room, southOpen, insideAt("Y", room.y[0]));
          const north = inset(room, northOpen, insideAt("Y", room.y[1]));
          push({
            start: x[xIndex]! + west,
            end: x[xIndex + 1]! - east,
            fixed: side === "SOUTH" ? room.bounds.minY + south : room.bounds.maxY - north,
            centerFixed: side === "SOUTH" ? room.bounds.minY : room.bounds.maxY,
            room,
            availableDepth: room.bounds.maxY - room.bounds.minY - south - north
          });
        }
      } else {
        const xIndex = side === "WEST" ? room.x[0] : room.x[1] - 1;
        const neighborX = side === "WEST" ? xIndex - 1 : xIndex + 1;
        for (let yIndex = room.y[0]; yIndex < room.y[1]; yIndex += 1) {
          if (sameCompound(room, spaceAtCell(neighborX, yIndex))) continue;
          const southOpen = sameCompound(room, spaceAtCell(xIndex, yIndex - 1));
          const northOpen = sameCompound(room, spaceAtCell(xIndex, yIndex + 1));
          const westOpen = sameCompound(room, spaceAtCell(room.x[0] - 1, yIndex));
          const eastOpen = sameCompound(room, spaceAtCell(room.x[1], yIndex));
          const west = inset(room, westOpen, insideAt("X", room.x[0]));
          const east = inset(room, eastOpen, insideAt("X", room.x[1]));
          const south = inset(room, southOpen, insideAt("Y", yIndex));
          const north = inset(room, northOpen, insideAt("Y", yIndex + 1));
          push({
            start: y[yIndex]! + south,
            end: y[yIndex + 1]! - north,
            fixed: side === "WEST" ? room.bounds.minX + west : room.bounds.maxX - east,
            centerFixed: side === "WEST" ? room.bounds.minX : room.bounds.maxX,
            room,
            availableDepth: room.bounds.maxX - room.bounds.minX - west - east
          });
        }
      }
    }
    return segments.sort((a, b) => a.start - b.start);
  };

  const placeOnWall = (segments: WallSegment[], offset: number, width: number): { segment: WallSegment; localOffset: number } | undefined => {
    let cursor = 0;
    for (const segment of segments) {
      const segmentLength = segment.end - segment.start;
      if (offset >= cursor - EPSILON && offset + width <= cursor + segmentLength + EPSILON) {
        return { segment, localOffset: offset - cursor };
      }
      cursor += segmentLength;
    }
    return undefined;
  };

  for (const definition of document.definitions) {
    if (definition.kind !== "furniture") continue;
    const match = definition.wall.match(/^(.*)_(NORTH|SOUTH|EAST|WEST)$/);
    if (!match || !match[1]) {
      report(diagnostics, "INVALID_WALL_REFERENCE", `${definition.wall} must use RoomName_NORTH, SOUTH, EAST, or WEST.`, definition.location);
      continue;
    }
    const roomName = match[1];
    const side = match[2] as WallSide;
    const room = spaceByName.get(roomName);
    if (!room) {
      report(diagnostics, "UNKNOWN_FURNITURE_WALL", `Unknown room wall ${definition.wall}.`, definition.location);
      continue;
    }
    const offset = length(definition.offset, `${definition.furnitureType} OFFSET`, diagnostics, true);
    const padding = definition.padding ? length(definition.padding, `${definition.furnitureType} PADDING`, diagnostics, true) : 0;
    const width = length(definition.width, `${definition.furnitureType} WIDTH`, diagnostics);
    const depth = definition.depth
      ? length(definition.depth, `${definition.furnitureType} DEPTH`, diagnostics)
      : FURNITURE_DEPTHS[definition.furnitureType];
    const segments = segmentsFor(descendants(roomName), side);
    const placed = placeOnWall(segments, offset, width);
    if (!placed) {
      report(diagnostics, "FURNITURE_OUTSIDE_WALL", `${definition.furnitureType} does not fit on ${definition.wall} at OFFSET ${definition.offset.raw}.`, definition.location);
      continue;
    }
    if (padding + depth > placed.segment.availableDepth + EPSILON) {
      report(diagnostics, "FURNITURE_OUTSIDE_ROOM", `${definition.furnitureType} extends beyond ${placed.segment.room.name}.`, definition.location);
    }
    const { segment, localOffset } = placed;
    const alongStart = segment.start + localOffset;
    const alongEnd = alongStart + width;
    let footprint: Point[];
    if (side === "SOUTH") {
      const near = segment.fixed + padding;
      footprint = [{ x: alongStart, y: near }, { x: alongEnd, y: near }, { x: alongEnd, y: near + depth }, { x: alongStart, y: near + depth }];
    } else if (side === "NORTH") {
      const near = segment.fixed - padding;
      footprint = [{ x: alongStart, y: near }, { x: alongEnd, y: near }, { x: alongEnd, y: near - depth }, { x: alongStart, y: near - depth }];
    } else if (side === "WEST") {
      const near = segment.fixed + padding;
      footprint = [{ x: near, y: alongStart }, { x: near, y: alongEnd }, { x: near + depth, y: alongEnd }, { x: near + depth, y: alongStart }];
    } else {
      const near = segment.fixed - padding;
      footprint = [{ x: near, y: alongStart }, { x: near, y: alongEnd }, { x: near - depth, y: alongEnd }, { x: near - depth, y: alongStart }];
    }
    const resolved: ResolvedFurniture = {
      type: definition.furnitureType,
      wall: definition.wall,
      room: roomName,
      side,
      offset,
      padding,
      width,
      depth,
      footprint,
      location: definition.location
    };
    plan.furniture.push(resolved);
  }

  const oppositeSide = (side: WallSide): WallSide => side === "NORTH" ? "SOUTH" : side === "SOUTH" ? "NORTH" : side === "EAST" ? "WEST" : "EAST";
  const alongValue = (point: Point, side: WallSide): number => side === "NORTH" || side === "SOUTH" ? point.x : point.y;
  const openingPoints = (segment: WallSegment, side: WallSide, start: number, end: number): { start: Point; end: Point } => ({
    start: side === "NORTH" || side === "SOUTH" ? { x: start, y: segment.centerFixed } : { x: segment.centerFixed, y: start },
    end: side === "NORTH" || side === "SOUTH" ? { x: end, y: segment.centerFixed } : { x: segment.centerFixed, y: end }
  });
  const hostWalls = (opening: ResolvedOpening): ResolvedWall[] => plan.walls.filter((wall) => {
    if (!wall.rooms.includes(opening.component)) return false;
    const horizontal = opening.side === "NORTH" || opening.side === "SOUTH";
    const wallFixed = horizontal ? wall.start.y : wall.start.x;
    const openingFixed = horizontal ? opening.start.y : opening.start.x;
    if (Math.abs(wallFixed - openingFixed) > EPSILON) return false;
    const wallStart = alongValue(wall.start, opening.side);
    const wallEnd = alongValue(wall.end, opening.side);
    const openingStart = alongValue(opening.start, opening.side);
    const openingEnd = alongValue(opening.end, opening.side);
    return Math.min(wallEnd, openingEnd) - Math.max(wallStart, openingStart) > EPSILON;
  });

  for (const definition of document.definitions) {
    if (definition.kind !== "opening") continue;
    const match = definition.wall.match(/^(.*)_(NORTH|SOUTH|EAST|WEST)$/);
    if (!match || !match[1]) {
      report(diagnostics, "INVALID_WALL_REFERENCE", `${definition.wall} must use RoomName_NORTH, SOUTH, EAST, or WEST.`, definition.location);
      continue;
    }
    const roomName = match[1];
    const side = match[2] as WallSide;
    if (!spaceByName.has(roomName)) {
      report(diagnostics, "UNKNOWN_OPENING_WALL", `Unknown room wall ${definition.wall}.`, definition.location);
      continue;
    }
    const offset = length(definition.offset, `${definition.openingType} OFFSET`, diagnostics, true);
    const width = length(definition.width, `${definition.openingType} WIDTH`, diagnostics);
    const placed = placeOnWall(segmentsFor(descendants(roomName), side), offset, width);
    if (!placed) {
      report(diagnostics, "OPENING_OUTSIDE_WALL", `${definition.openingType} does not fit on ${definition.wall} at OFFSET ${definition.offset.raw}.`, definition.location);
      continue;
    }
    const alongStart = placed.segment.start + placed.localOffset;
    const points = openingPoints(placed.segment, side, alongStart, alongStart + width);
    const opening: ResolvedOpening = {
      type: definition.openingType,
      wall: definition.wall,
      room: roomName,
      component: placed.segment.room.name,
      side,
      offset,
      width,
      hinge: definition.openingType === "DOOR" ? definition.hinge ?? "LEFT" : undefined,
      swing: definition.openingType === "DOOR" ? definition.swing ?? "INWARD" : undefined,
      start: points.start,
      end: points.end,
      wallThickness: 0,
      inferred: definition.isInferred,
      location: definition.location
    };
    const hosts = hostWalls(opening);
    opening.wallThickness = Math.max(0, ...hosts.map((wall) => wall.thickness));
    plan.openings.push(opening);

    if (opening.type !== "DOOR" || opening.inferred || hosts.length === 0 || hosts.some((wall) => wall.type !== "INNER")) continue;
    const otherNames = new Set(hosts.flatMap((wall) => wall.rooms).filter((name) => name !== opening.component));
    if (otherNames.size !== 1) continue;
    const otherName = otherNames.values().next().value!;
    const otherSide = oppositeSide(side);
    const targetSegments = segmentsFor(descendants(otherName), otherSide);
    let cursor = 0;
    let target: { segment: WallSegment; offset: number } | undefined;
    for (const segment of targetSegments) {
      if (alongStart >= segment.start - EPSILON && alongStart + width <= segment.end + EPSILON) {
        target = { segment, offset: cursor + alongStart - segment.start };
        break;
      }
      cursor += segment.end - segment.start;
    }
    if (!target) {
      report(diagnostics, "DOOR_COUNTERPART_FIT", `${definition.wall} does not fit the adjoining room ${otherName}.`, definition.location);
      continue;
    }
    const duplicate = plan.openings.some((candidate) => candidate.type === "DOOR" && candidate.room === otherName
      && candidate.side === otherSide && Math.abs(candidate.offset - target!.offset) <= EPSILON && Math.abs(candidate.width - width) <= EPSILON);
    if (duplicate) continue;
    plan.openings.push({
      ...opening,
      wall: `${otherName}_${otherSide}`,
      room: otherName,
      component: target.segment.room.name,
      side: otherSide,
      offset: target.offset,
      hinge: opening.hinge === "LEFT" ? "RIGHT" : "LEFT",
      swing: opening.swing === "INWARD" ? "OUTWARD" : "INWARD",
      inferred: true,
      inferredFrom: definition.wall
    });
  }

  const uniqueOpenings = new Map<string, ResolvedOpening>();
  for (const opening of plan.openings) {
    const key = [opening.type, opening.room, opening.side, Math.round(opening.offset * 1e7), Math.round(opening.width * 1e7)].join(":");
    const existing = uniqueOpenings.get(key);
    if (!existing || existing.inferred && !opening.inferred) uniqueOpenings.set(key, opening);
  }
  plan.openings = [...uniqueOpenings.values()];

  return plan;
}
