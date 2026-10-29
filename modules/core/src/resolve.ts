import { DEFAULTS } from "./defaults.js";
import { buildWallGraph, resolveRooms } from "./geometry.js";
import type {
  Diagnostic,
  Expression,
  PlanDocument,
  Point,
  ResolvedDoor,
  ResolvedObject,
  ResolvedOpening,
  ResolvedPlan,
  ResolvedWall,
  ResolvedWindow,
  SourceLocation,
  WallDefinition
} from "./types.js";

function report(
  diagnostics: Diagnostic[],
  code: string,
  message: string,
  location?: SourceLocation
): void {
  diagnostics.push({ code, message, severity: "error", location });
}

function evaluate(
  expression: Expression,
  variables: Map<string, number>,
  location: SourceLocation,
  diagnostics: Diagnostic[]
): number {
  switch (expression.kind) {
    case "number":
      return expression.value;
    case "identifier": {
      const value = variables.get(expression.name);
      if (value === undefined) {
        report(diagnostics, "UNKNOWN_VARIABLE", `Unknown or forward variable reference: ${expression.name}.`, location);
        return Number.NaN;
      }
      return value;
    }
    case "unary": {
      const value = evaluate(expression.operand, variables, location, diagnostics);
      return expression.operator === "-" ? -value : value;
    }
    case "binary": {
      const left = evaluate(expression.left, variables, location, diagnostics);
      const right = evaluate(expression.right, variables, location, diagnostics);
      if (expression.operator === "+") return left + right;
      if (expression.operator === "-") return left - right;
      if (expression.operator === "*") return left * right;
      if (right === 0) {
        report(diagnostics, "DIVISION_BY_ZERO", "Division by zero.", location);
        return Number.NaN;
      }
      return left / right;
    }
  }
}

function positive(
  value: number,
  label: string,
  location: SourceLocation,
  diagnostics: Diagnostic[],
  allowZero = false
): number {
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    report(diagnostics, "INVALID_LENGTH", `${label} must be ${allowZero ? "zero or greater" : "greater than zero"}.`, location);
    return 0;
  }
  return value;
}

function wallDefaults(wall: WallDefinition): { thickness: number; height: number } {
  if (wall.wallType === "VIRTUAL") return { thickness: 0, height: 0 };
  if (wall.wallType === "TERRACE") {
    return {
      thickness: DEFAULTS.default_terrace_thickness!,
      height: DEFAULTS.default_terrace_height!
    };
  }
  return {
    thickness: wall.wallType === "EXTERNAL" ? DEFAULTS.default_external_thickness! : DEFAULTS.default_internal_thickness!,
    height: DEFAULTS.default_wall_height!
  };
}

export function resolvePlan(document: PlanDocument, parseDiagnostics: Diagnostic[] = []): ResolvedPlan {
  const diagnostics = [...parseDiagnostics];
  const variables = new Map<string, number>(Object.entries(DEFAULTS));
  const walls: ResolvedWall[] = [];
  const doors: ResolvedDoor[] = [];
  const windows: ResolvedWindow[] = [];
  const openings: ResolvedOpening[] = [];
  const objects: ResolvedObject[] = [];
  const wallById = new Map<string, ResolvedWall>();
  const ids = new Set<string>();
  let lastWallId: string | undefined;

  for (const definition of document.definitions) {
    if (ids.has(definition.id)) {
      report(diagnostics, "DUPLICATE_ID", `Duplicate ID: ${definition.id}.`, definition.location);
      continue;
    }
    ids.add(definition.id);

    if (definition.kind === "let") {
      if (definition.id.startsWith("default_")) {
        report(diagnostics, "RESERVED_VARIABLE", "The default_ prefix is reserved for built-in variables.", definition.location);
        continue;
      }
      if (variables.has(definition.id)) {
        report(diagnostics, "DUPLICATE_VARIABLE", `Variable ${definition.id} is already defined.`, definition.location);
        continue;
      }
      variables.set(definition.id, evaluate(definition.expression, variables, definition.location, diagnostics));
      continue;
    }

    if (definition.kind === "room") continue;

    if (definition.kind === "wall") {
      let start: Point = { x: 0, y: 0 };
      if (walls.length === 0) {
        if (definition.start) {
          report(diagnostics, "ROOT_ANCHOR", "The first wall uses the implicit origin and cannot declare START.", definition.location);
        }
      } else if (!definition.start) {
        report(diagnostics, "MISSING_ANCHOR", `Wall ${definition.id} must reference an earlier wall.`, definition.location);
      } else {
        const anchor = definition.start;
        const host = wallById.get(anchor.wallId);
        if (!host) {
          report(diagnostics, "UNKNOWN_WALL", `Unknown or forward wall reference: ${anchor.wallId}.`, definition.location);
        } else if (anchor.point === "start") {
          start = { ...host.start };
        } else if (anchor.point === "end") {
          start = { ...host.end };
        } else {
          const offset = evaluate(anchor.offset!, variables, definition.location, diagnostics);
          if (offset < 0 || offset > host.length) {
            report(diagnostics, "INVALID_ANCHOR_OFFSET", `Anchor offset must be within wall ${host.id}.`, definition.location);
          }
          const ratio = host.length === 0 ? 0 : offset / host.length;
          start = {
            x: host.start.x + (host.end.x - host.start.x) * ratio,
            y: host.start.y + (host.end.y - host.start.y) * ratio
          };
        }
      }

      const direction = evaluate(definition.direction, variables, definition.location, diagnostics);
      const length = positive(evaluate(definition.length, variables, definition.location, diagnostics), `Length of ${definition.id}`, definition.location, diagnostics);
      const defaults = wallDefaults(definition);
      let thickness = definition.thickness
        ? positive(evaluate(definition.thickness, variables, definition.location, diagnostics), `Thickness of ${definition.id}`, definition.location, diagnostics, true)
        : defaults.thickness;
      let height = definition.height
        ? positive(evaluate(definition.height, variables, definition.location, diagnostics), `Height of ${definition.id}`, definition.location, diagnostics, true)
        : defaults.height;
      if (definition.wallType === "VIRTUAL") {
        if (thickness !== 0 || height !== 0) {
          report(diagnostics, "VIRTUAL_DIMENSIONS", "VIRTUAL walls must have zero thickness and height.", definition.location);
        }
        thickness = 0;
        height = 0;
      }
      const radians = direction * Math.PI / 180;
      const end = {
        x: start.x + length * Math.sin(radians),
        y: start.y + length * Math.cos(radians)
      };
      const wall: ResolvedWall = {
        id: definition.id,
        name: definition.name,
        location: definition.location,
        type: definition.wallType,
        start,
        end,
        direction,
        length,
        thickness,
        height
      };
      walls.push(wall);
      wallById.set(wall.id, wall);
      lastWallId = wall.id;
      continue;
    }

    const hostId = definition.hostId ?? lastWallId;
    if (!hostId || !wallById.has(hostId)) {
      report(diagnostics, "UNKNOWN_HOST", `${definition.id} has no valid preceding or explicit host wall.`, definition.location);
      continue;
    }
    const host = wallById.get(hostId)!;
    if (host.type === "VIRTUAL") {
      report(diagnostics, "VIRTUAL_HOST", `${definition.id} cannot attach to virtual wall ${host.id}.`, definition.location);
    }
    const base = {
      id: definition.id,
      name: definition.name,
      location: definition.location,
      hostId,
      offset: positive(evaluate(definition.offset, variables, definition.location, diagnostics), `Offset of ${definition.id}`, definition.location, diagnostics, true),
      side: definition.side
    };
    const checkSpan = (width: number) => {
      if (base.offset + width > host.length + 1e-7) {
        report(diagnostics, "ATTACHMENT_OUTSIDE_WALL", `${definition.id} extends beyond wall ${host.id}.`, definition.location);
      }
    };
    const checkHeight = (height: number, bottom = 0) => {
      if (bottom + height > host.height + 1e-7) {
        report(diagnostics, "ATTACHMENT_ABOVE_WALL", `${definition.id} extends above wall ${host.id}.`, definition.location);
      }
    };

    if (definition.kind === "door") {
      const width = positive(
        definition.width
          ? evaluate(definition.width, variables, definition.location, diagnostics)
          : definition.doorType === "EXTERNAL" ? DEFAULTS.default_external_door_width! : DEFAULTS.default_internal_door_width!,
        `Width of ${definition.id}`,
        definition.location,
        diagnostics
      );
      const height = positive(
        definition.height ? evaluate(definition.height, variables, definition.location, diagnostics) : DEFAULTS.default_door_height!,
        `Height of ${definition.id}`,
        definition.location,
        diagnostics
      );
      checkSpan(width);
      checkHeight(height);
      doors.push({ ...base, type: definition.doorType, width, height, openingType: definition.openingType });
    } else if (definition.kind === "window") {
      const width = positive(evaluate(definition.width, variables, definition.location, diagnostics), `Width of ${definition.id}`, definition.location, diagnostics);
      const height = positive(
        definition.height ? evaluate(definition.height, variables, definition.location, diagnostics) : DEFAULTS.default_window_height!,
        `Height of ${definition.id}`,
        definition.location,
        diagnostics
      );
      const sillHeight = positive(
        definition.sillHeight ? evaluate(definition.sillHeight, variables, definition.location, diagnostics) : DEFAULTS.default_window_sill_height!,
        `Sill height of ${definition.id}`,
        definition.location,
        diagnostics,
        true
      );
      checkSpan(width);
      checkHeight(height, sillHeight);
      windows.push({ ...base, width, height, sillHeight });
    } else if (definition.kind === "opening") {
      const width = positive(evaluate(definition.width, variables, definition.location, diagnostics), `Width of ${definition.id}`, definition.location, diagnostics);
      const height = positive(
        definition.height ? evaluate(definition.height, variables, definition.location, diagnostics) : DEFAULTS.default_opening_height!,
        `Height of ${definition.id}`,
        definition.location,
        diagnostics
      );
      checkSpan(width);
      checkHeight(height);
      openings.push({ ...base, width, height, openingType: definition.openingType });
    } else {
      if (!definition.size) {
        report(diagnostics, "MISSING_SIZE", `Object ${definition.id} requires SIZE.`, definition.location);
        continue;
      }
      const along = positive(evaluate(definition.size[0], variables, definition.location, diagnostics), `Size of ${definition.id}`, definition.location, diagnostics);
      const depth = positive(evaluate(definition.size[1], variables, definition.location, diagnostics), `Depth of ${definition.id}`, definition.location, diagnostics);
      const gap = definition.gap
        ? positive(evaluate(definition.gap, variables, definition.location, diagnostics), `Gap of ${definition.id}`, definition.location, diagnostics, true)
        : 0;
      checkSpan(along);
      objects.push({ ...base, objectType: definition.objectType, gap, size: [along, depth] });
    }
  }

  const roomDefinitions = document.definitions.filter((definition) => definition.kind === "room");
  for (const room of roomDefinitions) {
    for (const wallId of room.wallIds) {
      if (!wallById.has(wallId)) {
        report(diagnostics, "UNKNOWN_ROOM_WALL", `Room ${room.id} references unknown wall ${wallId}.`, room.location);
      }
    }
    if (new Set(room.wallIds).size !== room.wallIds.length) {
      report(diagnostics, "DUPLICATE_ROOM_WALL", `Room ${room.id} references a wall more than once.`, room.location);
    }
  }
  const graph = buildWallGraph(walls, diagnostics);
  const rooms = resolveRooms(roomDefinitions, graph, diagnostics);

  return {
    variables: Object.fromEntries(variables),
    walls,
    rooms,
    doors,
    windows,
    openings,
    objects,
    diagnostics
  };
}
