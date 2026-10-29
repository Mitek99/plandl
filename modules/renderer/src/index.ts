import type { Point, ResolvedObject, ResolvedPlan, ResolvedWall } from "@plandl/core";
import type { Frame } from "./frame.js";
import { renderFurniture } from "./furniture.js";

function format(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function vector(wall: ResolvedWall): { along: Point; left: Point; right: Point } {
  const along = { x: (wall.end.x - wall.start.x) / wall.length, y: (wall.end.y - wall.start.y) / wall.length };
  return {
    along,
    left: { x: -along.y, y: along.x },
    right: { x: along.y, y: -along.x }
  };
}

function add(point: Point, direction: Point, amount: number): Point {
  return { x: point.x + direction.x * amount, y: point.y + direction.y * amount };
}

function at(wall: ResolvedWall, offset: number): Point {
  return add(wall.start, vector(wall).along, offset);
}

function project(point: Point, frame: Frame): Point {
  return { x: point.x - frame.minX + frame.margin, y: frame.maxY - point.y + frame.margin };
}

function pointsAttribute(points: Point[], frame: Frame): string {
  return points.map((point) => {
    const projected = project(point, frame);
    return `${format(projected.x)},${format(projected.y)}`;
  }).join(" ");
}

function polygon(points: Point[], frame: Frame, attributes: string): string {
  return `<polygon points="${pointsAttribute(points, frame)}" ${attributes}/>`;
}

function line(start: Point, end: Point, frame: Frame, attributes: string): string {
  const a = project(start, frame);
  const b = project(end, frame);
  return `<line x1="${format(a.x)}" y1="${format(a.y)}" x2="${format(b.x)}" y2="${format(b.y)}" ${attributes}/>`;
}

function wallPolygon(wall: ResolvedWall): Point[] {
  const { right } = vector(wall);
  return [wall.start, wall.end, add(wall.end, right, wall.thickness), add(wall.start, right, wall.thickness)];
}

function gapPolygon(wall: ResolvedWall, offset: number, width: number): Point[] {
  const { right } = vector(wall);
  const start = at(wall, offset);
  const end = at(wall, offset + width);
  const depth = wall.thickness + 2;
  return [add(start, right, -1), add(end, right, -1), add(end, right, depth), add(start, right, depth)];
}

function centroid(points: Point[]): Point {
  let x = 0;
  let y = 0;
  let signed = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = (index + 1) % points.length;
    const factor = points[index]!.x * points[next]!.y - points[next]!.x * points[index]!.y;
    signed += factor;
    x += (points[index]!.x + points[next]!.x) * factor;
    y += (points[index]!.y + points[next]!.y) * factor;
  }
  if (Math.abs(signed) < 1e-7) return points[0] ?? { x: 0, y: 0 };
  return { x: x / (3 * signed), y: y / (3 * signed) };
}

function objectPolygon(object: ResolvedObject, host: ResolvedWall): Point[] {
  const { along, left, right } = vector(host);
  const normal = object.side === "LEFT" ? left : right;
  const faceOffset = object.side === "RIGHT" ? host.thickness + object.gap : object.gap;
  const start = add(at(host, object.offset), normal, faceOffset);
  const end = add(start, along, object.size[0]);
  return [start, end, add(end, normal, object.size[1]), add(start, normal, object.size[1])];
}

function text(point: Point, frame: Frame, value: string, size = 160, weight = 400): string {
  const projected = project(point, frame);
  return `<text x="${format(projected.x)}" y="${format(projected.y)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${size}" font-weight="${weight}" fill="#1a202c">${escapeXml(value)}</text>`;
}

export function renderSvg(plan: ResolvedPlan): string {
  if (plan.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    throw new Error("Cannot render a plan with validation errors.");
  }
  const hosts = new Map(plan.walls.map((wall) => [wall.id, wall]));
  const objectPolygons = plan.objects.map((object) => ({ object, points: objectPolygon(object, hosts.get(object.hostId)!) }));
  const allPoints = [
    ...plan.walls.filter((wall) => wall.type !== "VIRTUAL").flatMap(wallPolygon),
    ...plan.walls.flatMap((wall) => [wall.start, wall.end]),
    ...objectPolygons.flatMap((entry) => entry.points)
  ];
  const minX = Math.min(...allPoints.map((point) => point.x));
  const maxX = Math.max(...allPoints.map((point) => point.x));
  const minY = Math.min(...allPoints.map((point) => point.y));
  const maxY = Math.max(...allPoints.map((point) => point.y));
  const margin = 500;
  const frame: Frame = { minX, maxY, margin };
  const width = maxX - minX + margin * 2;
  const height = maxY - minY + margin * 2;
  const pixelHeight = Math.max(1, Math.round(1200 * height / width));
  const output: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${pixelHeight}" viewBox="0 0 ${format(width)} ${format(height)}" role="img" aria-labelledby="title">`,
    `<title id="title">PlanDL spatial plan</title>`,
    `<rect width="100%" height="100%" fill="white"/>`
  ];

  for (const room of plan.rooms) {
    if (room.boundary.length > 0) {
      output.push(polygon(room.boundary, frame, 'fill="#f7fafc" stroke="none"'));
    }
  }
  for (const wall of plan.walls) {
    if (wall.type === "VIRTUAL") {
      output.push(line(wall.start, wall.end, frame, 'stroke="#a0aec0" stroke-width="18" stroke-dasharray="100 70"'));
    } else if (wall.type === "TERRACE") {
      output.push(polygon(wallPolygon(wall), frame, 'fill="#e2e8f0" stroke="#4a5568" stroke-width="14"'));
      const count = Math.max(1, Math.floor(wall.length / 600));
      for (let index = 0; index <= count; index += 1) {
        const point = at(wall, wall.length * index / count);
        output.push(line(point, add(point, vector(wall).right, wall.thickness), frame, 'stroke="#2d3748" stroke-width="24"'));
      }
    } else {
      output.push(polygon(wallPolygon(wall), frame, `fill="${wall.type === "EXTERNAL" ? "#2d3748" : "#4a5568"}" stroke="none"`));
    }
  }

  for (const opening of plan.openings) {
    const host = hosts.get(opening.hostId)!;
    output.push(polygon(gapPolygon(host, opening.offset, opening.width), frame, 'fill="white" stroke="none"'));
    output.push(line(at(host, opening.offset), add(at(host, opening.offset), vector(host).right, host.thickness), frame, 'stroke="#4a5568" stroke-width="18"'));
    output.push(line(at(host, opening.offset + opening.width), add(at(host, opening.offset + opening.width), vector(host).right, host.thickness), frame, 'stroke="#4a5568" stroke-width="18"'));
  }
  for (const window of plan.windows) {
    const host = hosts.get(window.hostId)!;
    output.push(polygon(gapPolygon(host, window.offset, window.width), frame, 'fill="white" stroke="none"'));
    output.push(line(at(host, window.offset), at(host, window.offset + window.width), frame, 'stroke="#3182ce" stroke-width="24"'));
    output.push(line(add(at(host, window.offset), vector(host).right, host.thickness), add(at(host, window.offset + window.width), vector(host).right, host.thickness), frame, 'stroke="#3182ce" stroke-width="24"'));
  }
  for (const door of plan.doors) {
    const host = hosts.get(door.hostId)!;
    const { right, left } = vector(host);
    const normal = door.side === "LEFT" ? left : right;
    const face = door.side === "RIGHT" ? host.thickness : 0;
    output.push(polygon(gapPolygon(host, door.offset, door.width), frame, 'fill="white" stroke="none"'));
    const hinge = add(at(host, door.offset), normal, face);
    output.push(line(hinge, add(hinge, normal, door.width), frame, 'stroke="#2f855a" stroke-width="24"'));
    output.push(line(at(host, door.offset + door.width), add(at(host, door.offset + door.width), right, host.thickness), frame, 'stroke="#4a5568" stroke-width="18"'));
  }
  for (const entry of objectPolygons) {
    const furniture = renderFurniture(entry.object, hosts.get(entry.object.hostId)!, frame);
    if (furniture) {
      output.push(furniture);
    } else {
      output.push(polygon(entry.points, frame, 'fill="#edf2f7" stroke="#4a5568" stroke-width="16"'));
      output.push(text(centroid(entry.points), frame, entry.object.name, 130));
    }
  }
  for (const room of plan.rooms) {
    if (room.boundary.length === 0) continue;
    const center = centroid(room.boundary);
    output.push(text(center, frame, room.name, 180, 600));
    output.push(text(add(center, { x: 0, y: 1 }, -220), frame, `${format(room.area / 1e6)} m²`, 140));
  }
  output.push("</svg>");
  return `${output.join("\n")}\n`;
}
