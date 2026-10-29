import type {
  Diagnostic,
  Point,
  ResolvedRoom,
  ResolvedWall,
  RoomDefinition,
  SourceLocation
} from "./types.js";

const EPSILON = 1e-7;

interface GraphEdge {
  wallId: string;
  from: string;
  to: string;
}

interface WallGraph {
  points: Map<string, Point>;
  edges: GraphEdge[];
}

interface HalfEdge {
  edgeIndex: number;
  from: string;
  to: string;
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointKey(point: Point): string {
  return `${Math.round(point.x * 1e7)}:${Math.round(point.y * 1e7)}`;
}

function pointOnSegment(point: Point, start: Point, end: Point): boolean {
  const segment = subtract(end, start);
  const relative = subtract(point, start);
  if (Math.abs(cross(segment, relative)) > EPSILON * Math.max(1, distance(start, end))) {
    return false;
  }
  const dot = relative.x * segment.x + relative.y * segment.y;
  const lengthSquared = segment.x * segment.x + segment.y * segment.y;
  return dot >= -EPSILON && dot <= lengthSquared + EPSILON;
}

function report(
  diagnostics: Diagnostic[],
  code: string,
  message: string,
  location: SourceLocation
): void {
  diagnostics.push({ code, message, severity: "error", location });
}

function inspectPair(a: ResolvedWall, b: ResolvedWall, diagnostics: Diagnostic[]): void {
  const p = a.start;
  const q = b.start;
  const r = subtract(a.end, a.start);
  const s = subtract(b.end, b.start);
  const denominator = cross(r, s);
  const relative = subtract(q, p);

  if (Math.abs(denominator) <= EPSILON) {
    if (Math.abs(cross(relative, r)) > EPSILON * Math.max(1, a.length)) {
      return;
    }
    const useX = Math.abs(r.x) >= Math.abs(r.y);
    const aValues = [useX ? a.start.x : a.start.y, useX ? a.end.x : a.end.y].sort((x, y) => x - y);
    const bValues = [useX ? b.start.x : b.start.y, useX ? b.end.x : b.end.y].sort((x, y) => x - y);
    const aMin = aValues[0]!;
    const aMax = aValues[1]!;
    const bMin = bValues[0]!;
    const bMax = bValues[1]!;
    if (Math.min(aMax, bMax) - Math.max(aMin, bMin) > EPSILON) {
      report(diagnostics, "WALL_OVERLAP", `Walls ${a.id} and ${b.id} overlap.`, b.location);
    }
    return;
  }

  const t = cross(relative, s) / denominator;
  const u = cross(relative, r) / denominator;
  const interior = (value: number) => value > EPSILON && value < 1 - EPSILON;
  if (interior(t) && interior(u)) {
    report(diagnostics, "WALL_CROSSING", `Walls ${a.id} and ${b.id} cross.`, b.location);
  }
}

export function buildWallGraph(walls: ResolvedWall[], diagnostics: Diagnostic[]): WallGraph {
  for (let index = 0; index < walls.length; index += 1) {
    for (let other = index + 1; other < walls.length; other += 1) {
      inspectPair(walls[index]!, walls[other]!, diagnostics);
    }
  }

  const points = new Map<string, Point>();
  const edges: GraphEdge[] = [];
  for (const wall of walls) {
    const candidates = [wall.start, wall.end];
    for (const other of walls) {
      if (other.id === wall.id) continue;
      for (const endpoint of [other.start, other.end]) {
        if (pointOnSegment(endpoint, wall.start, wall.end)) {
          candidates.push(endpoint);
        }
      }
    }

    const unique = new Map<string, Point>();
    for (const candidate of candidates) {
      unique.set(pointKey(candidate), candidate);
    }
    const ordered = [...unique.values()].sort((a, b) => {
      const wallVector = subtract(wall.end, wall.start);
      const aVector = subtract(a, wall.start);
      const bVector = subtract(b, wall.start);
      return aVector.x * wallVector.x + aVector.y * wallVector.y - (bVector.x * wallVector.x + bVector.y * wallVector.y);
    });

    for (const point of ordered) {
      points.set(pointKey(point), point);
    }
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const from = ordered[index]!;
      const to = ordered[index + 1]!;
      if (distance(from, to) > EPSILON) {
        edges.push({ wallId: wall.id, from: pointKey(from), to: pointKey(to) });
      }
    }
  }
  return { points, edges };
}

function signedArea(points: Point[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = (index + 1) % points.length;
    area += points[index]!.x * points[next]!.y - points[next]!.x * points[index]!.y;
  }
  return area / 2;
}

function boundedFaces(graph: WallGraph, wallIds: Set<string>): Point[][] {
  const edges = graph.edges.filter((edge) => wallIds.has(edge.wallId));
  const outgoing = new Map<string, HalfEdge[]>();
  const addHalfEdge = (halfEdge: HalfEdge) => {
    const list = outgoing.get(halfEdge.from) ?? [];
    list.push(halfEdge);
    outgoing.set(halfEdge.from, list);
  };
  edges.forEach((edge, edgeIndex) => {
    addHalfEdge({ edgeIndex, from: edge.from, to: edge.to });
    addHalfEdge({ edgeIndex, from: edge.to, to: edge.from });
  });

  for (const list of outgoing.values()) {
    list.sort((a, b) => {
      const aPoint = graph.points.get(a.from)!;
      const aTarget = graph.points.get(a.to)!;
      const bPoint = graph.points.get(b.from)!;
      const bTarget = graph.points.get(b.to)!;
      return Math.atan2(aTarget.y - aPoint.y, aTarget.x - aPoint.x) - Math.atan2(bTarget.y - bPoint.y, bTarget.x - bPoint.x);
    });
  }

  const visited = new Set<string>();
  const faces: Point[][] = [];
  for (const [from, list] of outgoing) {
    for (const initial of list) {
      const initialKey = `${initial.edgeIndex}:${initial.from}`;
      if (visited.has(initialKey)) continue;
      let current = initial;
      const keys: string[] = [];
      let closed = false;
      for (let guard = 0; guard <= edges.length * 2; guard += 1) {
        const key = `${current.edgeIndex}:${current.from}`;
        if (visited.has(key)) {
          closed = key === initialKey;
          break;
        }
        visited.add(key);
        keys.push(current.from);
        const adjacent = outgoing.get(current.to) ?? [];
        const reverseIndex = adjacent.findIndex((candidate) => candidate.edgeIndex === current.edgeIndex && candidate.from === current.to && candidate.to === current.from);
        if (reverseIndex < 0 || adjacent.length === 0) break;
        current = adjacent[(reverseIndex - 1 + adjacent.length) % adjacent.length]!;
      }
      if (!closed || keys.length < 3) continue;
      const polygon = keys.map((key) => graph.points.get(key)!);
      if (signedArea(polygon) > EPSILON) {
        faces.push(polygon);
      }
    }
  }
  return faces;
}

export function resolveRooms(
  rooms: RoomDefinition[],
  graph: WallGraph,
  diagnostics: Diagnostic[]
): ResolvedRoom[] {
  return rooms.map((room) => {
    const faces = boundedFaces(graph, new Set(room.wallIds));
    if (faces.length !== 1) {
      report(
        diagnostics,
        faces.length === 0 ? "ROOM_NOT_CLOSED" : "ROOM_AMBIGUOUS",
        faces.length === 0
          ? `Room ${room.id} does not select one closed boundary.`
          : `Room ${room.id} selects more than one closed boundary.`,
        room.location
      );
      return { ...room, boundary: [], area: 0 };
    }
    const boundary = faces[0]!;
    return { ...room, boundary, area: signedArea(boundary) };
  });
}
