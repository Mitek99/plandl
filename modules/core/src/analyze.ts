// Relational and room-type checks that run after a plan resolves without errors.
// Everything here is a warning: the plan is geometrically valid, but an architect would mark it up.
// Messages carry numbers (lengths, offsets, areas) so an author can fix the problem in one edit.

import { FURNITURE_DEPTHS } from "./defaults.js";
import { OUTSIDE } from "./types.js";
import type {
  Diagnostic,
  FurnitureType,
  InferredProperties,
  ParameterValue,
  PlanDocument,
  Point,
  ResolvedConnection,
  ResolvedFurniture,
  ResolvedOpening,
  ResolvedPlan,
  ResolvedRoom,
  ResolvedWall,
  RoomType,
  Scalar,
  SourceLocation,
  WallSide
} from "./types.js";

const EPSILON = 1e-6;
/** Overlaps smaller than this (0.01 m², a 10 × 10 cm corner) are ignored as touching. */
const OVERLAP_TOLERANCE = 10_000;

export const HABITABLE_TYPES: readonly RoomType[] = ["LIVING", "KITCHEN", "DINING", "BEDROOM", "OFFICE"];

export const REQUIRED_FIXTURES: Readonly<Partial<Record<RoomType, ReadonlyArray<readonly FurnitureType[]>>>> = {
  KITCHEN: [["SINK"], ["OVEN"], ["FRIDGE"]],
  BATHROOM: [["SINK"], ["SHOWER", "BATHTUB"]],
  WC: [["TOILET"]],
  BEDROOM: [["BED"]]
};

export const MINIMUM_SIZES: Readonly<Partial<Record<RoomType, { area: number; width: number }>>> = {
  LIVING: { area: 10e6, width: 2800 },
  KITCHEN: { area: 4e6, width: 1500 },
  DINING: { area: 5e6, width: 2000 },
  BEDROOM: { area: 6.5e6, width: 2100 },
  BATHROOM: { area: 2.5e6, width: 1400 },
  WC: { area: 0.9e6, width: 800 },
  OFFICE: { area: 4e6, width: 1800 },
  CIRCULATION: { area: 0, width: 900 },
  UTILITY: { area: 1.5e6, width: 1000 }
};

/** How far the chairs drawn at a TABLE or DESK reach beyond its top, and a chair's width, in millimetres. */
export const CHAIR_REACH = 350;
export const CHAIR_SIZE = 450;

/** Circulation above this share of the net area is reported. Typical dwellings use 10-15%. */
export const CIRCULATION_LIMIT = 0.2;

/** Every warning `check` can emit, as published in the spec. */
export const WARNING_CODES: Readonly<Record<string, string>> = {
  NO_ENTRANCE: "no door or opening leads outside",
  UNREACHABLE_ROOM: "a room has no door, or cannot be reached from an entrance",
  ACCESS_THROUGH_ROOM: "a typed room is entered only through a bathroom, WC, kitchen or bedroom",
  WET_ROOM_OFF_KITCHEN: "a BATHROOM or WC opens directly off a KITCHEN",
  DOOR_INTO_CORRIDOR: "a door swings into a CIRCULATION room instead of into the room",
  NO_WINDOW: "a LIVING, KITCHEN, DINING, BEDROOM or OFFICE room has no window in an outer wall",
  WINDOW_IN_INNER_WALL: "a window is in a wall between two rooms",
  MISSING_FIXTURE: "a typed room lacks its required fixtures",
  MISPLACED_FIXTURE: "a toilet, shower or bathtub stands in a dry room, or a bed in a kitchen, bathroom, WC or hall",
  ROOM_TOO_SMALL: "a typed room is below its minimum area or width",
  CIRCULATION_SHARE: `CIRCULATION rooms take more than ${Math.round(CIRCULATION_LIMIT * 100)}% of the net area`,
  FURNITURE_OVERLAP: "two pieces of furniture overlap (often at a corner between perpendicular walls)",
  FURNITURE_IN_DOOR_SWING: "furniture stands where a door leaf swings",
  DOOR_SWINGS_COLLIDE: "two door leaves swing into the same floor",
  OPENINGS_OVERLAP: "two openings overlap on the same wall",
  OPENING_SPANS_ROOMS: "a door or opening spans the walls of two different rooms",
  ENCLOSED_EMPTY_CELL: "a grid cell surrounded by rooms belongs to no room",
  INFER_MISMATCH: "a value written after INFER differs from what the compiler computes"
};

const WET_FIXTURES: readonly FurnitureType[] = ["TOILET", "SHOWER", "BATHTUB"];
const DRY_ROOMS: readonly RoomType[] = ["LIVING", "KITCHEN", "DINING", "BEDROOM", "OFFICE", "CIRCULATION"];

function warn(plan: ResolvedPlan, code: string, message: string, location?: SourceLocation): void {
  const diagnostic: Diagnostic = { code, message, severity: "warning", location };
  plan.diagnostics.push(diagnostic);
}

function m(value: number): string {
  return `${Number((value / 1000).toFixed(2))}m`;
}

function mm(value: number): string {
  return `${Math.round(value)}mm`;
}

function sqm(value: number): string {
  return `${Number((value / 1e6).toFixed(2))} m²`;
}

// ---------- convex polygon geometry ----------

function signedArea(polygon: Point[]): number {
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!;
    const b = polygon[(index + 1) % polygon.length]!;
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function counterClockwise(polygon: Point[]): Point[] {
  return signedArea(polygon) < 0 ? [...polygon].reverse() : polygon;
}

/** Area of the intersection of two convex polygons (Sutherland-Hodgman clipping). */
export function overlapArea(subject: Point[], clip: Point[]): number {
  let output = counterClockwise(subject);
  const clipper = counterClockwise(clip);
  for (let index = 0; index < clipper.length && output.length > 0; index += 1) {
    const a = clipper[index]!;
    const b = clipper[(index + 1) % clipper.length]!;
    const inside = (point: Point): boolean => (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) >= -EPSILON;
    const intersect = (p: Point, q: Point): Point => {
      const a1 = b.y - a.y;
      const b1 = a.x - b.x;
      const c1 = a1 * a.x + b1 * a.y;
      const a2 = q.y - p.y;
      const b2 = p.x - q.x;
      const c2 = a2 * p.x + b2 * p.y;
      const determinant = a1 * b2 - a2 * b1;
      if (Math.abs(determinant) < EPSILON) return q;
      return { x: (b2 * c1 - b1 * c2) / determinant, y: (a1 * c2 - a2 * c1) / determinant };
    };
    const input = output;
    output = [];
    for (let current = 0; current < input.length; current += 1) {
      const p = input[current]!;
      const q = input[(current + 1) % input.length]!;
      if (inside(q)) {
        if (!inside(p)) output.push(intersect(p, q));
        output.push(q);
      } else if (inside(p)) {
        output.push(intersect(p, q));
      }
    }
  }
  return output.length < 3 ? 0 : Math.abs(signedArea(output));
}

function center(points: Point[]): Point {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  };
}

function inside(point: Point, room: ResolvedRoom): boolean {
  return point.x > room.bounds.minX - EPSILON && point.x < room.bounds.maxX + EPSILON
    && point.y > room.bounds.minY - EPSILON && point.y < room.bounds.maxY + EPSILON;
}

// ---------- doors ----------

function inwardNormal(side: WallSide): Point {
  if (side === "SOUTH") return { x: 0, y: 1 };
  if (side === "NORTH") return { x: 0, y: -1 };
  if (side === "WEST") return { x: 1, y: 0 };
  return { x: -1, y: 0 };
}

export interface DoorSweep {
  opening: ResolvedOpening;
  hinge: Point;
  /** The quarter disk the leaf sweeps, as a convex polygon. */
  area: Point[];
  swingsInto: string;
}

/** The leaf geometry used by the renderer: hinge end, and the direction the leaf opens. */
export function doorLeafGeometry(opening: ResolvedOpening): { hinge: Point; closed: Point; open: Point } {
  const leftAtEnd = opening.side === "SOUTH" || opening.side === "EAST";
  const atEnd = opening.hinge === "LEFT" ? leftAtEnd : !leftAtEnd;
  const hinge = atEnd ? opening.end : opening.start;
  const other = atEnd ? opening.start : opening.end;
  const length = Math.hypot(other.x - hinge.x, other.y - hinge.y) || 1;
  const inward = inwardNormal(opening.side);
  const direction = opening.swing === "OUTWARD" ? -1 : 1;
  return {
    hinge,
    closed: { x: (other.x - hinge.x) / length, y: (other.y - hinge.y) / length },
    open: { x: inward.x * direction, y: inward.y * direction }
  };
}

function swingFor(plan: ResolvedPlan, opening: ResolvedOpening, hosts: ResolvedWall[], swingsInto: string): DoorSweep {
  const leaf = doorLeafGeometry(opening);
  const wall = hosts[0];
  const room = [...plan.rooms, ...plan.terraces].find((candidate) => candidate.name === swingsInto);
  // Start the sweep at the wall face on the side the door opens to.
  const face = !wall ? 0 : wall.type === "OUTER" ? room?.type === "ROOM" ? wall.inside : wall.outside : wall.thickness / 2;
  const hinge = { x: leaf.hinge.x + leaf.open.x * face, y: leaf.hinge.y + leaf.open.y * face };
  const area: Point[] = [hinge];
  const steps = 8;
  for (let step = 0; step <= steps; step += 1) {
    const angle = (Math.PI / 2) * (step / steps);
    area.push({
      x: hinge.x + opening.width * (Math.cos(angle) * leaf.closed.x + Math.sin(angle) * leaf.open.x),
      y: hinge.y + opening.width * (Math.cos(angle) * leaf.closed.y + Math.sin(angle) * leaf.open.y)
    });
  }
  return { opening, hinge, area, swingsInto };
}

// ---------- spaces ----------

interface SpaceIndex {
  spaces: ResolvedRoom[];
  byName: Map<string, ResolvedRoom>;
  members: (name: string) => ResolvedRoom[];
  root: (name: string) => ResolvedRoom | undefined;
  typeOf: (name: string) => RoomType | "OUTSIDE" | "TERRACE" | undefined;
  label: (name: string) => string;
}

function indexSpaces(plan: ResolvedPlan): SpaceIndex {
  const spaces = [...plan.rooms, ...plan.terraces];
  const byName = new Map(spaces.map((room) => [room.name, room]));
  const parent = new Map<string, string>();
  for (const room of spaces) for (const child of room.merge) parent.set(child, room.name);
  const members = (name: string): ResolvedRoom[] => spaces.filter((room) => {
    for (let current: string | undefined = room.name; current; current = parent.get(current)) {
      if (current === name) return true;
    }
    return false;
  });
  const root = (name: string): ResolvedRoom | undefined => {
    const room = byName.get(name);
    return room ? byName.get(room.compound) ?? room : undefined;
  };
  const typeOf = (name: string): RoomType | "OUTSIDE" | "TERRACE" | undefined => {
    if (name === OUTSIDE) return "OUTSIDE";
    const room = byName.get(name);
    if (!room) return undefined;
    if (room.type === "TERRACE") return "TERRACE";
    return room.roomType ?? root(name)?.roomType;
  };
  const label = (name: string): string => {
    if (name === OUTSIDE) return "outside";
    const type = typeOf(name);
    return type && type !== "TERRACE" ? `${name} (${type})` : name;
  };
  return { spaces, byName, members, root, typeOf, label };
}

function sideOf(room: ResolvedRoom, wall: ResolvedWall): string {
  const vertical = Math.abs(wall.start.x - wall.end.x) < EPSILON;
  if (vertical) return Math.abs(wall.start.x - room.bounds.minX) < EPSILON ? "W" : "E";
  return Math.abs(wall.start.y - room.bounds.minY) < EPSILON ? "S" : "N";
}

/** Everything across the walls of a space: other spaces and the outside, with compass sides. */
function borders(plan: ResolvedPlan, index: SpaceIndex, name: string): Array<{ name: string; side: string }> {
  const members = new Set(index.members(name).map((room) => room.name));
  const found: Array<{ name: string; side: string }> = [];
  for (const wall of plan.walls) {
    const own = wall.rooms.find((room) => members.has(room));
    if (!own) continue;
    const side = sideOf(index.byName.get(own)!, wall);
    const others = wall.rooms.filter((room) => !members.has(room));
    for (const other of others.length > 0 ? others : wall.type !== "INNER" ? [OUTSIDE] : []) {
      if (!found.some((entry) => entry.name === other && entry.side === side)) found.push({ name: other, side });
    }
  }
  return found;
}

function formatBorders(entries: Array<{ name: string; side: string }>, index: SpaceIndex): string {
  const grouped = new Map<string, string[]>();
  for (const entry of entries) grouped.set(entry.name, [...(grouped.get(entry.name) ?? []), entry.side]);
  return [...grouped].map(([name, sides]) => `${index.label(name)} ${sides.join("/")}`).join(", ");
}

// ---------- summary ----------

export interface RoomSummary {
  name: string;
  type?: RoomType | "TERRACE";
  innerDimensions?: [number, number];
  area: number;
  access: string[];
  windows: number;
}

export interface PlanSummary {
  rooms: RoomSummary[];
  /** Net floor area of rooms (terraces excluded), in mm². */
  netArea: number;
  circulationArea: number;
  circulationShare: number;
}

/** Spaces directly connected to a room or terrace (or its merged members) through doors and openings. */
export function accessOf(plan: ResolvedPlan, name: string): string[] {
  const index = indexSpaces(plan);
  const members = new Set(index.members(name).map((room) => room.name));
  const result: string[] = [];
  for (const connection of plan.connections) {
    const [a, b] = connection.rooms;
    const other = members.has(a) && !members.has(b) ? b : members.has(b) && !members.has(a) ? a : undefined;
    if (other && !result.includes(other)) result.push(other);
  }
  return result;
}

export function summarizePlan(plan: ResolvedPlan): PlanSummary {
  const index = indexSpaces(plan);
  const rooms: RoomSummary[] = index.spaces.map((room) => {
    const members = new Set(index.members(room.name).map((member) => member.name));
    return {
      name: room.name,
      type: room.type === "TERRACE" ? "TERRACE" : room.roomType,
      innerDimensions: room.innerDimensions,
      area: room.area,
      access: accessOf(plan, room.name),
      windows: plan.openings.filter((opening) => opening.type === "WINDOW" && !opening.inferred && members.has(opening.component)).length
    };
  });
  const roots = plan.rooms.filter((room) => room.compound === room.name);
  const netArea = roots.reduce((sum, room) => sum + room.area, 0);
  const circulationArea = roots.filter((room) => room.roomType === "CIRCULATION").reduce((sum, room) => sum + room.area, 0);
  return { rooms, netArea, circulationArea, circulationShare: netArea > 0 ? circulationArea / netArea : 0 };
}

// ---------- INFER claims ----------

function scalarLength(value: ParameterValue | undefined): number | undefined {
  if (!value || typeof value === "string" || Array.isArray(value)) return undefined;
  const scalar = value as Scalar;
  if (scalar.unit === "sqm") return undefined;
  return scalar.value * (scalar.unit === "m" ? 1000 : scalar.unit === "cm" ? 10 : 1);
}

function scalarArea(value: ParameterValue | undefined): number | undefined {
  if (!value || typeof value === "string" || Array.isArray(value)) return undefined;
  const scalar = value as Scalar;
  return scalar.unit === "sqm" ? scalar.value * 1e6 : undefined;
}

function stringList(value: ParameterValue | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return [value];
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) return value as string[];
  return undefined;
}

function lengthDiffers(claimed: number, actual: number): boolean {
  return Math.abs(claimed - actual) > Math.max(10, Math.abs(actual) * 0.01);
}

function areaDiffers(claimed: number, actual: number): boolean {
  return Math.abs(claimed - actual) > Math.max(0.05e6, Math.abs(actual) * 0.01);
}

function checkClaims(plan: ResolvedPlan, document: PlanDocument): void {
  const mismatch = (subject: string, field: string, claimed: string, actual: string, location: SourceLocation): void => {
    warn(plan, "INFER_MISMATCH", `${subject}: INFER ${field}=${claimed}, but the compiler computes ${actual}.`, location);
  };
  const raw = (value: ParameterValue): string => typeof value === "string" ? value
    : Array.isArray(value) ? `[${value.map((entry) => typeof entry === "string" ? entry : entry.raw).join(",")}]` : value.raw;
  const sameSet = (a: string[], b: string[]): boolean => a.length === b.length && a.every((entry) => b.includes(entry));
  const fmtList = (values: string[]): string => `[${values.join(",")}]`;

  for (const definition of document.definitions) {
    const claims: InferredProperties | undefined = "inferred" in definition && typeof definition.inferred === "object" ? definition.inferred : undefined;
    if (!claims || Object.keys(claims).length === 0) continue;
    if (definition.kind === "grid" && plan.grid) {
      const grid = plan.grid;
      const dims = claims.OUTER_DIMENSIONS;
      if (Array.isArray(dims) && dims.length === 2) {
        const values = dims.map((entry) => scalarLength(entry));
        if (values.some((value, axis) => value === undefined || lengthDiffers(value, grid.outerDimensions[axis]!))) {
          mismatch("GRID", "OUTER_DIMENSIONS", raw(dims), `[${m(grid.outerDimensions[0])},${m(grid.outerDimensions[1])}]`, definition.location);
        }
      }
      const area = scalarArea(claims.OUTER_AREA);
      if (area !== undefined && areaDiffers(area, grid.outerArea)) mismatch("GRID", "OUTER_AREA", raw(claims.OUTER_AREA!), sqm(grid.outerArea).replace(" m²", "sqm"), definition.location);
      const perimeter = scalarLength(claims.PERIMETER);
      if (perimeter !== undefined && lengthDiffers(perimeter, grid.perimeter)) mismatch("GRID", "PERIMETER", raw(claims.PERIMETER!), m(grid.perimeter), definition.location);
    }
    if (definition.kind === "room" || definition.kind === "terrace") {
      const room = [...plan.rooms, ...plan.terraces].find((candidate) => candidate.name === definition.name);
      if (!room) continue;
      const dims = claims.INNER_DIMENSIONS;
      if (Array.isArray(dims) && dims.length === 2 && room.innerDimensions) {
        const values = dims.map((entry) => scalarLength(entry));
        if (values.some((value, axis) => value === undefined || lengthDiffers(value, room.innerDimensions![axis]!))) {
          mismatch(room.name, "INNER_DIMENSIONS", raw(dims), `[${m(room.innerDimensions[0])},${m(room.innerDimensions[1])}]`, definition.location);
        }
      }
      const area = scalarArea(claims.AREA);
      if (area !== undefined && areaDiffers(area, room.area)) mismatch(room.name, "AREA", raw(claims.AREA!), sqm(room.area).replace(" m²", "sqm"), definition.location);
      const access = stringList(claims.ACCESS);
      const actual = accessOf(plan, room.name);
      if (access && !sameSet(access, actual)) mismatch(room.name, "ACCESS", fmtList(access), fmtList(actual), definition.location);
    }
    if (definition.kind === "furniture") {
      const furniture = plan.furniture.find((candidate) => candidate.location.line === definition.location.line);
      const depth = scalarLength(claims.DEPTH);
      if (furniture && depth !== undefined && lengthDiffers(depth, furniture.depth)) {
        mismatch(`${furniture.type} on ${furniture.wall}`, "DEPTH", raw(claims.DEPTH!), mm(furniture.depth), definition.location);
      }
    }
    if (definition.kind === "opening" && !definition.isInferred) {
      const opening = plan.openings.find((candidate) => !candidate.inferred && candidate.location.line === definition.location.line);
      const connection = plan.connections.find((candidate) => candidate.location.line === definition.location.line);
      if (!opening) continue;
      const subject = `${opening.type} ${definition.between ? `BETWEEN=[${definition.between.join(",")}]` : `on ${opening.wall}`}`;
      const wall = stringList(claims.WALL)?.[0];
      if (wall && wall !== opening.wall) mismatch(subject, "WALL", wall, opening.wall, definition.location);
      const offset = scalarLength(claims.OFFSET);
      if (offset !== undefined && lengthDiffers(offset, opening.offset)) mismatch(subject, "OFFSET", raw(claims.OFFSET!), mm(opening.offset), definition.location);
      const hinge = stringList(claims.HINGE)?.[0];
      if (hinge && opening.hinge && hinge !== opening.hinge) mismatch(subject, "HINGE", hinge, opening.hinge, definition.location);
      const swing = stringList(claims.OPENING)?.[0];
      if (swing && opening.swing && swing !== opening.swing) mismatch(subject, "OPENING", swing, opening.swing, definition.location);
      const connects = stringList(claims.CONNECTS);
      if (connects && connection && !sameSet(connects, connection.rooms)) mismatch(subject, "CONNECTS", fmtList(connects), fmtList(connection.rooms), definition.location);
      const into = stringList(claims.SWINGS_INTO)?.[0];
      if (into && connection?.swingsInto && into !== connection.swingsInto) mismatch(subject, "SWINGS_INTO", into, connection.swingsInto, definition.location);
    }
  }
}

// ---------- the checks ----------

export function analyzePlan(plan: ResolvedPlan, document: PlanDocument): void {
  const index = indexSpaces(plan);
  const gridLocation = plan.grid?.location;
  const rooms = plan.rooms;

  // Physical openings: one entry per opening, explicit definitions preferred over mirrored ones.
  const physical = new Map<string, ResolvedOpening>();
  for (const opening of plan.openings) {
    const key = [opening.type, Math.round(opening.start.x), Math.round(opening.start.y), Math.round(opening.end.x), Math.round(opening.end.y)].join(":");
    const existing = physical.get(key);
    if (!existing || (existing.inferred && !opening.inferred)) physical.set(key, opening);
  }
  const openings = [...physical.values()];
  const hostsOf = (opening: ResolvedOpening): ResolvedWall[] => {
    const horizontal = opening.side === "NORTH" || opening.side === "SOUTH";
    const along = (point: Point): number => horizontal ? point.x : point.y;
    return plan.walls.filter((wall) => {
      if (!wall.rooms.includes(opening.component)) return false;
      const wallFixed = horizontal ? wall.start.y : wall.start.x;
      const openingFixed = horizontal ? opening.start.y : opening.start.x;
      if (Math.abs(wallFixed - openingFixed) > EPSILON) return false;
      return Math.min(along(wall.end), along(opening.end)) - Math.max(along(wall.start), along(opening.start)) > EPSILON;
    });
  };
  const connectionFor = (opening: ResolvedOpening): ResolvedConnection | undefined =>
    plan.connections.find((connection) => connection.location.line === opening.location.line && connection.location.column === opening.location.column);

  // --- access: entrance and reachability ---
  const roots = rooms.filter((room) => room.compound === room.name);
  const rootName = (name: string): string => name === OUTSIDE ? OUTSIDE : index.root(name)?.type === "TERRACE" ? OUTSIDE : index.root(name)?.name ?? name;
  const graph = new Map<string, Set<string>>();
  const link = (a: string, b: string): void => {
    if (a === b) return;
    graph.set(a, (graph.get(a) ?? new Set()).add(b));
    graph.set(b, (graph.get(b) ?? new Set()).add(a));
  };
  for (const connection of plan.connections) link(rootName(connection.rooms[0]), rootName(connection.rooms[1]));
  const reached = new Set<string>([OUTSIDE]);
  const queue = [OUTSIDE];
  while (queue.length > 0) {
    for (const next of graph.get(queue.shift()!) ?? []) {
      if (!reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  const hasEntrance = (graph.get(OUTSIDE)?.size ?? 0) > 0;
  if (rooms.length > 0 && !hasEntrance) {
    const outerWalls = roots.filter((room) => borders(plan, index, room.name).some((entry) => entry.name === OUTSIDE)).map((room) => room.name);
    warn(
      plan,
      "NO_ENTRANCE",
      `No door or opening leads outside, so no room can be entered. Rooms with an outer wall: ${outerWalls.join(", ") || "none"}. Add for example DOOR BETWEEN=[OUTSIDE,${outerWalls[0] ?? "Hall"}] WIDTH=900mm.`,
      gridLocation
    );
  }
  for (const room of roots) {
    if (reached.has(room.name)) continue;
    // A single room with no entrance is already covered by NO_ENTRANCE.
    if (!hasEntrance && roots.length === 1) continue;
    const neighbours = [...(graph.get(room.name) ?? [])];
    if (neighbours.length === 0) {
      warn(plan, "UNREACHABLE_ROOM", `${index.label(room.name)} has no door or opening. It borders: ${formatBorders(borders(plan, index, room.name), index)}.`, room.location);
    } else if (hasEntrance) {
      warn(plan, "UNREACHABLE_ROOM", `${index.label(room.name)} cannot be reached from an entrance. Its doors lead only to ${neighbours.map((name) => index.label(name)).join(", ")}, which cannot be reached either.`, room.location);
    }
  }

  // --- access: rooms entered through the wrong kind of room ---
  const neighboursOf = (name: string): string[] => accessOf(plan, name);
  const throughOnly: Partial<Record<RoomType, readonly string[]>> = {
    BEDROOM: ["KITCHEN", "BATHROOM", "WC", "BEDROOM", "STORAGE", "UTILITY"],
    LIVING: ["BATHROOM", "WC", "STORAGE", "UTILITY", "BEDROOM"],
    KITCHEN: ["BATHROOM", "WC", "STORAGE", "BEDROOM"],
    DINING: ["BATHROOM", "WC", "STORAGE", "BEDROOM"],
    OFFICE: ["BATHROOM", "WC", "STORAGE", "KITCHEN"]
  };
  for (const room of index.spaces) {
    const type = room.type === "ROOM" ? room.roomType : undefined;
    const bad = type ? throughOnly[type] : undefined;
    if (!bad || room.compound !== room.name && !room.roomType) continue;
    const neighbours = neighboursOf(room.name);
    if (neighbours.length === 0) continue;
    if (neighbours.every((name) => bad.includes(index.typeOf(name) ?? ""))) {
      const better = borders(plan, index, room.name)
        .map((entry) => entry.name)
        .filter((name, position, list) => list.indexOf(name) === position)
        .filter((name) => name !== OUTSIDE && !bad.includes(index.typeOf(name) ?? "OTHER"));
      warn(
        plan,
        "ACCESS_THROUGH_ROOM",
        `${index.label(room.name)} is entered only through ${neighbours.map((name) => index.label(name)).join(", ")}.${better.length > 0 ? ` It also borders ${better.map((name) => index.label(name)).join(", ")}; a door there would avoid this.` : ""}`,
        room.location
      );
    }
  }
  for (const connection of plan.connections) {
    const [a, b] = connection.rooms;
    const types = [index.typeOf(a), index.typeOf(b)];
    const wet = types[0] === "BATHROOM" || types[0] === "WC" ? a : types[1] === "BATHROOM" || types[1] === "WC" ? b : undefined;
    const kitchen = types[0] === "KITCHEN" ? a : types[1] === "KITCHEN" ? b : undefined;
    if (wet && kitchen) {
      warn(plan, "WET_ROOM_OFF_KITCHEN", `${index.label(wet)} opens directly off ${index.label(kitchen)} (${connection.wall}). Bathrooms and WCs are normally entered from a hall or a bedroom.`, connection.location);
    }
    if (connection.type === "DOOR" && connection.swingsInto) {
      const into = connection.swingsInto;
      const other = into === a ? b : a;
      const otherType = index.typeOf(other);
      if (index.typeOf(into) === "CIRCULATION" && other !== OUTSIDE && otherType !== "CIRCULATION" && otherType !== "WC" && otherType !== "STORAGE" && otherType !== "TERRACE") {
        warn(
          plan,
          "DOOR_INTO_CORRIDOR",
          `The door between ${into} and ${other} swings into ${index.label(into)}. Doors normally open into the room: write DOOR BETWEEN=[${into},${other}], or set OPENING=${connection.wall.startsWith(`${into}_`) ? "OUTWARD" : "INWARD"} on ${connection.wall}.`,
          connection.location
        );
      }
    }
  }

  // --- windows ---
  for (const opening of openings) {
    if (opening.type !== "WINDOW") continue;
    const hosts = hostsOf(opening);
    if (hosts.length > 0 && hosts.every((wall) => wall.type === "INNER")) {
      const others = [...new Set(hosts.flatMap((wall) => wall.rooms).filter((name) => name !== opening.component))];
      warn(plan, "WINDOW_IN_INNER_WALL", `The window on ${opening.wall} is in the inner wall shared with ${others.join(", ")}. Windows belong in outer walls.`, opening.location);
    }
  }
  for (const room of index.spaces) {
    if (room.type !== "ROOM" || !room.roomType || !HABITABLE_TYPES.includes(room.roomType)) continue;
    const compound = new Set(index.members(room.compound).map((member) => member.name));
    const lit = openings.some((opening) => opening.type === "WINDOW" && compound.has(opening.component)
      && hostsOf(opening).some((wall) => wall.type !== "INNER"));
    if (lit) continue;
    const outer = borders(plan, index, room.compound).filter((entry) => entry.name === OUTSIDE || index.typeOf(entry.name) === "TERRACE");
    const sides = [...new Set(outer.map((entry) => entry.side))];
    warn(
      plan,
      "NO_WINDOW",
      outer.length > 0
        ? `${index.label(room.name)} has no window. It has outer walls on side ${sides.join(", ")}; add for example WINDOW WALL=${room.compound}_${({ N: "NORTH", S: "SOUTH", E: "EAST", W: "WEST" } as Record<string, string>)[sides[0]!]} OFFSET=500mm WIDTH=1200mm.`
        : `${index.label(room.name)} has no window and no outer wall, so it cannot get daylight. Move it to the edge of the plan.`,
      room.location
    );
  }

  // --- fixtures ---
  const furnitureIn = (name: string): ResolvedFurniture[] => {
    const members = index.members(name);
    return plan.furniture.filter((item) => members.some((member) => inside(center(item.footprint), member)));
  };
  for (const room of index.spaces) {
    if (room.type !== "ROOM" || !room.roomType) continue;
    const required = REQUIRED_FIXTURES[room.roomType];
    if (!required) continue;
    const present = new Set(furnitureIn(room.name).map((item) => item.type));
    const missing = required.filter((options) => !options.some((type) => present.has(type)));
    if (missing.length > 0) {
      const names = missing.map((options) => options.length > 1 ? `(${options.join(" or ")})` : options[0]);
      const depths = [...new Set(missing.flat())].map((type) => `${type} ${FURNITURE_DEPTHS[type]}mm`).join(", ");
      warn(plan, "MISSING_FIXTURE", `${index.label(room.name)} needs ${names.join(" and ")}. Standard depths: ${depths}.`, room.location);
    }
  }
  for (const item of plan.furniture) {
    const point = center(item.footprint);
    const holder = index.spaces.find((room) => room.type === "ROOM" && inside(point, room));
    if (!holder) continue;
    const type = index.typeOf(holder.name);
    const wetInDry = WET_FIXTURES.includes(item.type) && type && DRY_ROOMS.includes(type as RoomType);
    const bedMisplaced = item.type === "BED" && (type === "KITCHEN" || type === "BATHROOM" || type === "WC" || type === "CIRCULATION");
    if (wetInDry || bedMisplaced) {
      warn(plan, "MISPLACED_FIXTURE", `${item.type} on ${item.wall} stands in ${index.label(holder.name)}.`, item.location);
    }
  }

  // --- sizes and circulation ---
  for (const room of index.spaces) {
    if (room.type !== "ROOM" || !room.roomType) continue;
    const minimum = MINIMUM_SIZES[room.roomType];
    if (!minimum) continue;
    const isRoot = room.compound === room.name;
    const area = isRoot ? room.area : (room.innerDimensions ? room.innerDimensions[0] * room.innerDimensions[1] : room.area);
    const width = room.innerDimensions ? Math.min(...room.innerDimensions) : undefined;
    const problems: string[] = [];
    if (area + EPSILON < minimum.area) problems.push(`its area is ${sqm(area)} (minimum ${sqm(minimum.area)})`);
    if (width !== undefined && width + EPSILON < minimum.width) problems.push(`its narrow side is ${m(width)} (minimum ${m(minimum.width)})`);
    if (problems.length > 0) warn(plan, "ROOM_TOO_SMALL", `${index.label(room.name)} is too small for its type: ${problems.join(" and ")}.`, room.location);
  }
  const summary = summarizePlan(plan);
  if (summary.circulationArea > 0 && summary.circulationShare > CIRCULATION_LIMIT) {
    const halls = roots.filter((room) => room.roomType === "CIRCULATION").map((room) => `${room.name} ${sqm(room.area)}`);
    warn(
      plan,
      "CIRCULATION_SHARE",
      `Circulation takes ${Math.round(summary.circulationShare * 100)}% of the net area (${sqm(summary.circulationArea)} of ${sqm(summary.netArea)}: ${halls.join(", ")}). Typical homes use 10-15%; narrow or shorten the halls.`,
      gridLocation
    );
  }

  // --- collisions: furniture, door swings, openings ---
  const swings: DoorSweep[] = [];
  for (const opening of openings) {
    if (opening.type !== "DOOR") continue;
    const connection = connectionFor(opening);
    const into = connection?.swingsInto ?? (opening.swing === "OUTWARD" ? OUTSIDE : opening.component);
    swings.push(swingFor(plan, opening, hostsOf(opening), into));
  }
  const describeFurniture = (item: ResolvedFurniture): string =>
    `${item.type}${item.type === "TABLE" ? " with its chairs" : item.type === "DESK" ? " with its chair" : ""} on ${item.wall} (OFFSET ${mm(item.offset)}, WIDTH ${mm(item.width)})`;
  // A TABLE's or DESK's WIDTH x DEPTH is its top. The renderer draws real-size chairs beyond it: all round a
  // table (CHAIR_REACH on every side), and one 450mm chair centred in front of a desk. Checks count the chairs.
  const occupied = (item: ResolvedFurniture): Point[][] => {
    if (item.type === "TABLE") {
      const xs = item.footprint.map((point) => point.x);
      const ys = item.footprint.map((point) => point.y);
      const [minX, maxX, minY, maxY] = [Math.min(...xs) - CHAIR_REACH, Math.max(...xs) + CHAIR_REACH, Math.min(...ys) - CHAIR_REACH, Math.max(...ys) + CHAIR_REACH];
      return [[{ x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }]];
    }
    if (item.type === "DESK") {
      const [origin, alongEnd, , inwardEnd] = item.footprint as [Point, Point, Point, Point];
      const along = { x: (alongEnd.x - origin.x) / item.width, y: (alongEnd.y - origin.y) / item.width };
      const inward = { x: (inwardEnd.x - origin.x) / item.depth, y: (inwardEnd.y - origin.y) / item.depth };
      const at = (a: number, d: number): Point => ({ x: origin.x + along.x * a + inward.x * d, y: origin.y + along.y * a + inward.y * d });
      const left = item.width / 2 - CHAIR_SIZE / 2;
      const right = item.width / 2 + CHAIR_SIZE / 2;
      const chair = [at(left, item.depth), at(right, item.depth), at(right, item.depth + CHAIR_REACH), at(left, item.depth + CHAIR_REACH)];
      return [item.footprint, chair];
    }
    return [item.footprint];
  };
  const overlapOf = (a: Point[][], b: Point[][]): number => a.reduce((sum, first) => sum + b.reduce((inner, second) => inner + overlapArea(first, second), 0), 0);
  const describeDoor = (opening: ResolvedOpening): string =>
    `the door on ${opening.wall} (OFFSET ${mm(opening.offset)}-${mm(opening.offset + opening.width)})`;

  for (let first = 0; first < plan.furniture.length; first += 1) {
    for (let second = first + 1; second < plan.furniture.length; second += 1) {
      const a = plan.furniture[first]!;
      const b = plan.furniture[second]!;
      const area = overlapOf(occupied(a), occupied(b));
      if (area > OVERLAP_TOLERANCE) {
        warn(plan, "FURNITURE_OVERLAP", `${describeFurniture(b)} overlaps ${describeFurniture(a)} by ${sqm(area)}.`, b.location);
      }
    }
  }
  for (const swing of swings) {
    for (const item of plan.furniture) {
      const area = overlapOf(occupied(item), [swing.area]);
      if (area > OVERLAP_TOLERANCE) {
        const sameWall = item.wall === swing.opening.wall;
        const hint = sameWall
          ? ` Keep furniture on ${item.wall} outside OFFSET ${mm(swing.opening.offset)}-${mm(swing.opening.offset + swing.opening.width)}.`
          : ` The leaf sweeps ${mm(swing.opening.width)} into ${swing.swingsInto === OUTSIDE ? "the outside" : swing.swingsInto}.`;
        warn(plan, "FURNITURE_IN_DOOR_SWING", `${describeFurniture(item)} is in the swing of ${describeDoor(swing.opening)} by ${sqm(area)}.${hint}`, item.location);
      }
    }
  }
  for (let first = 0; first < swings.length; first += 1) {
    for (let second = first + 1; second < swings.length; second += 1) {
      const a = swings[first]!;
      const b = swings[second]!;
      const area = overlapArea(a.area, b.area);
      if (area > OVERLAP_TOLERANCE) {
        warn(plan, "DOOR_SWINGS_COLLIDE", `${describeDoor(b.opening)} and ${describeDoor(a.opening)} swing into the same ${sqm(area)}. Move one door, or change HINGE or OPENING.`, b.opening.location);
      }
    }
  }
  for (let first = 0; first < openings.length; first += 1) {
    for (let second = first + 1; second < openings.length; second += 1) {
      const a = openings[first]!;
      const b = openings[second]!;
      const horizontalA = a.side === "NORTH" || a.side === "SOUTH";
      const horizontalB = b.side === "NORTH" || b.side === "SOUTH";
      if (horizontalA !== horizontalB) continue;
      const fixedA = horizontalA ? a.start.y : a.start.x;
      const fixedB = horizontalB ? b.start.y : b.start.x;
      if (Math.abs(fixedA - fixedB) > EPSILON) continue;
      const along = (opening: ResolvedOpening): [number, number] => {
        const s = horizontalA ? opening.start.x : opening.start.y;
        const e = horizontalA ? opening.end.x : opening.end.y;
        return [Math.min(s, e), Math.max(s, e)];
      };
      const [as, ae] = along(a);
      const [bs, be] = along(b);
      const shared = Math.min(ae, be) - Math.max(as, bs);
      if (shared > 1) {
        warn(plan, "OPENINGS_OVERLAP", `The ${b.type.toLowerCase()} on ${b.wall} (OFFSET ${mm(b.offset)}) overlaps the ${a.type.toLowerCase()} on ${a.wall} (OFFSET ${mm(a.offset)}) by ${mm(shared)}.`, b.location);
      }
    }
  }

  // --- empty cells enclosed by rooms ---
  if (plan.grid) {
    const columns = plan.grid.x.length - 1;
    const rows = plan.grid.y.length - 1;
    const covered = (column: number, row: number): boolean => index.spaces.some((room) => room.x[0] <= column && room.x[1] > column && room.y[0] <= row && room.y[1] > row);
    const open = new Set<string>();
    const pending: Array<[number, number]> = [];
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        if ((column === 0 || row === 0 || column === columns - 1 || row === rows - 1) && !covered(column, row)) {
          open.add(`${column}:${row}`);
          pending.push([column, row]);
        }
      }
    }
    while (pending.length > 0) {
      const [column, row] = pending.pop()!;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nc = column + dc;
        const nr = row + dr;
        if (nc < 0 || nr < 0 || nc >= columns || nr >= rows || open.has(`${nc}:${nr}`) || covered(nc, nr)) continue;
        open.add(`${nc}:${nr}`);
        pending.push([nc, nr]);
      }
    }
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        if (covered(column, row) || open.has(`${column}:${row}`)) continue;
        const area = (plan.grid.x[column + 1]! - plan.grid.x[column]!) * (plan.grid.y[row + 1]! - plan.grid.y[row]!);
        warn(plan, "ENCLOSED_EMPTY_CELL", `Grid cell X=[${column},${column + 1}] Y=[${row},${row + 1}] (${sqm(area)}) is enclosed by rooms but belongs to none. Add a ROOM there or MERGE it into a neighbour.`, gridLocation);
      }
    }
  }

  checkClaims(plan, document);
}
