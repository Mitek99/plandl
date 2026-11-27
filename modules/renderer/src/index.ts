import { wallPoints } from "@plandl/core";
import type { Point, ResolvedOpening, ResolvedPlan, ResolvedRoom } from "@plandl/core";
import type { Frame } from "./frame.js";
import { renderFurniture } from "./furniture.js";

function format(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

function text(point: Point, frame: Frame, value: string, size = 160, weight = 400): string {
  const projected = project(point, frame);
  return `<text x="${format(projected.x)}" y="${format(projected.y)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${format(size)}" font-weight="${weight}" fill="#1a202c" stroke="#f7fafc" stroke-width="${format(size * 0.25)}" stroke-linejoin="round" paint-order="stroke">${escapeXml(value)}</text>`;
}

function endpointKey(point: Point): string {
  return `${Math.round(point.x * 1e7)}:${Math.round(point.y * 1e7)}`;
}

function roomRectangle(room: ResolvedRoom): Point[] {
  return [
    { x: room.bounds.minX, y: room.bounds.minY },
    { x: room.bounds.maxX, y: room.bounds.minY },
    { x: room.bounds.maxX, y: room.bounds.maxY },
    { x: room.bounds.minX, y: room.bounds.maxY }
  ];
}

function wallJoins(plan: ResolvedPlan): Point[][] {
  const endpoints = new Map<string, { walls: number; points: Point[] }>();
  for (const wall of plan.walls) {
    if (wall.thickness <= 0) continue;
    const points = wallPoints(wall);
    for (const [endpoint, indices] of [[wall.start, [0, 3]], [wall.end, [1, 2]]] as const) {
      const key = endpointKey(endpoint);
      const join = endpoints.get(key) ?? { walls: 0, points: [] };
      join.walls += 1;
      join.points.push(...indices.map((index) => points[index]!));
      endpoints.set(key, join);
    }
  }
  const joins: Point[][] = [];
  for (const join of endpoints.values()) {
    if (join.walls < 2) continue;
    const minX = Math.min(...join.points.map((point) => point.x));
    const maxX = Math.max(...join.points.map((point) => point.x));
    const minY = Math.min(...join.points.map((point) => point.y));
    const maxY = Math.max(...join.points.map((point) => point.y));
    joins.push([{ x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }]);
  }
  return joins;
}

function openingGap(opening: ResolvedOpening): Point[] {
  const dx = opening.end.x - opening.start.x;
  const dy = opening.end.y - opening.start.y;
  const length = Math.hypot(dx, dy);
  const left = { x: -dy / length, y: dx / length };
  const depth = Math.max(10, opening.wallThickness + 2);
  const shift = (point: Point, amount: number): Point => ({ x: point.x + left.x * amount, y: point.y + left.y * amount });
  return [shift(opening.start, depth), shift(opening.end, depth), shift(opening.end, -depth), shift(opening.start, -depth)];
}

function inwardNormal(opening: ResolvedOpening): Point {
  if (opening.side === "SOUTH") return { x: 0, y: 1 };
  if (opening.side === "NORTH") return { x: 0, y: -1 };
  if (opening.side === "WEST") return { x: 1, y: 0 };
  return { x: -1, y: 0 };
}

function doorLeaf(opening: ResolvedOpening): { hinge: Point; end: Point } {
  const leftAtEnd = opening.side === "SOUTH" || opening.side === "EAST";
  const atEnd = opening.hinge === "LEFT" ? leftAtEnd : !leftAtEnd;
  const hinge = atEnd ? opening.end : opening.start;
  const inward = inwardNormal(opening);
  const direction = opening.swing === "INWARD" ? 1 : -1;
  return {
    hinge,
    end: { x: hinge.x + inward.x * opening.width * direction, y: hinge.y + inward.y * opening.width * direction }
  };
}

export interface RenderOptions {
  /** Draw the grid lines with their index markers (X along the top, Y down the left). Off by default. */
  grid?: boolean;
}

function gridOverlay(
  plan: ResolvedPlan,
  frame: Frame,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  radius: number
): string {
  const grid = plan.grid!;
  const stroke = Math.max(12, radius / 9);
  const lineStyle = `stroke="#c05621" stroke-width="${format(stroke)}" stroke-dasharray="${format(stroke * 8)} ${format(stroke * 5)}" stroke-opacity="0.7"`;
  const bubbleStyle = `fill="white" stroke="#c05621" stroke-width="${format(stroke)}"`;
  const gap = radius * 1.1;
  const output = ['<g class="plandl-grid">'];
  const bubble = (center: Point, label: string, tooltip: string): string => {
    const projected = project(center, frame);
    return [
      "<g>",
      `<title>${escapeXml(tooltip)}</title>`,
      `<circle cx="${format(projected.x)}" cy="${format(projected.y)}" r="${format(radius)}" ${bubbleStyle}/>`,
      `<text x="${format(projected.x)}" y="${format(projected.y)}" text-anchor="middle" dominant-baseline="central" font-family="system-ui, sans-serif" font-size="${format(radius * 1.1)}" font-weight="600" fill="#9c4221">${escapeXml(label)}</text>`,
      "</g>"
    ].join("");
  };
  const metres = (value: number): string => `${format(value / 1000)} m`;
  grid.x.forEach((x, index) => {
    const top = bounds.maxY + gap;
    output.push(line({ x, y: bounds.minY - gap }, { x, y: top }, frame, lineStyle));
    output.push(bubble({ x, y: top + radius }, String(index), `X grid line ${index} at ${metres(x)}`));
  });
  grid.y.forEach((y, index) => {
    const left = bounds.minX - gap;
    output.push(line({ x: left, y }, { x: bounds.maxX + gap, y }, frame, lineStyle));
    output.push(bubble({ x: left - radius, y }, String(index), `Y grid line ${index} at ${metres(y)}`));
  });
  output.push("</g>");
  return output.join("\n");
}

export function renderSvg(plan: ResolvedPlan, options: RenderOptions = {}): string {
  if (plan.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    throw new Error("Cannot render a plan with validation errors.");
  }
  if (!plan.grid) throw new Error("Cannot render a plan without a grid.");

  const joins = wallJoins(plan);
  const spaces = [...plan.rooms, ...plan.terraces];
  const allPoints = [
    ...spaces.flatMap(roomRectangle),
    ...plan.walls.flatMap(wallPoints),
    ...plan.walls.flatMap((wall) => [wall.start, wall.end]),
    ...joins.flat(),
    ...plan.furniture.flatMap((furniture) => furniture.footprint),
    ...plan.openings.flatMap(openingGap),
    ...plan.openings.filter((opening) => opening.type === "DOOR").flatMap((opening) => {
      const leaf = doorLeaf(opening);
      return [leaf.hinge, leaf.end];
    })
  ];
  if (allPoints.length === 0) {
    allPoints.push(
      { x: 0, y: 0 },
      { x: plan.grid.x[plan.grid.x.length - 1]!, y: plan.grid.y[plan.grid.y.length - 1]! }
    );
  }
  const planBounds = {
    minX: Math.min(...allPoints.map((point) => point.x)),
    maxX: Math.max(...allPoints.map((point) => point.x)),
    minY: Math.min(...allPoints.map((point) => point.y)),
    maxY: Math.max(...allPoints.map((point) => point.y))
  };
  // Grid markers sit outside the plan: X markers above it, Y markers to its left.
  const gridRadius = Math.max(140, (planBounds.maxX - planBounds.minX) / 70);
  const gridSpace = options.grid ? gridRadius * 3.4 : 0;
  const minX = planBounds.minX - gridSpace;
  const maxX = planBounds.maxX;
  const minY = planBounds.minY;
  const maxY = planBounds.maxY + gridSpace;
  const margin = 500;
  const frame: Frame = { minX, maxY, margin };
  const width = Math.max(1, maxX - minX + margin * 2);
  const height = Math.max(1, maxY - minY + margin * 2);
  const pixelHeight = Math.max(1, Math.round(1200 * height / width));
  const output: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${pixelHeight}" viewBox="0 0 ${format(width)} ${format(height)}" role="img" aria-labelledby="title">`,
    `<title id="title">PlanDL floor plan</title>`,
    `<rect width="100%" height="100%" fill="white"/>`
  ];

  for (const room of spaces) {
    output.push(polygon(roomRectangle(room), frame, `fill="${room.type === "ROOM" ? "#f7fafc" : "#edf2f7"}" stroke="none"`));
  }
  for (const wall of plan.walls) {
    if (wall.type === "TERRACE") {
      output.push(line(wall.start, wall.end, frame, 'stroke="#718096" stroke-width="18"'));
    } else {
      output.push(polygon(wallPoints(wall), frame, `fill="${wall.type === "OUTER" ? "#2d3748" : "#4a5568"}" stroke="none"`));
    }
  }
  for (const join of joins) {
    output.push(polygon(join, frame, 'fill="#2d3748" stroke="none"'));
  }
  for (const opening of plan.openings) {
    const gap = openingGap(opening);
    output.push(polygon(gap, frame, 'fill="white" stroke="none"'));
    output.push(line(gap[0]!, gap[3]!, frame, 'stroke="#4a5568" stroke-width="18"'));
    output.push(line(gap[1]!, gap[2]!, frame, 'stroke="#4a5568" stroke-width="18"'));
    if (opening.type === "WINDOW") {
      output.push(line(opening.start, opening.end, frame, 'stroke="#3182ce" stroke-width="24"'));
      if (opening.wallThickness > 0) {
        output.push(line(gap[0]!, gap[1]!, frame, 'stroke="#3182ce" stroke-width="18"'));
        output.push(line(gap[3]!, gap[2]!, frame, 'stroke="#3182ce" stroke-width="18"'));
      }
    } else if (opening.type === "DOOR") {
      const leaf = doorLeaf(opening);
      // The quarter arc the leaf sweeps, from the open leaf back to the closed position.
      const closed = leaf.hinge === opening.end ? opening.start : opening.end;
      const h = project(leaf.hinge, frame);
      const a = project(leaf.end, frame);
      const b = project(closed, frame);
      const sweep = (a.x - h.x) * (b.y - h.y) - (a.y - h.y) * (b.x - h.x) > 0 ? 1 : 0;
      output.push(`<path d="M ${format(a.x)} ${format(a.y)} A ${format(opening.width)} ${format(opening.width)} 0 0 ${sweep} ${format(b.x)} ${format(b.y)}" fill="none" stroke="#2f855a" stroke-width="12" stroke-dasharray="40 30"/>`);
      output.push(line(leaf.hinge, leaf.end, frame, 'stroke="#2f855a" stroke-width="24"'));
    }
  }
  for (const furniture of plan.furniture) {
    output.push(renderFurniture(furniture, frame));
  }
  if (options.grid) output.push(gridOverlay(plan, frame, planBounds, gridRadius));

  // Label sizes follow the drawing width so labels stay readable once the SVG is scaled to fit a page:
  // a name is 1/32 of the width (about 18px when the drawing is shown 580px wide), never below the old fixed sizes.
  const nameSize = Math.max(180, width / 32);
  const areaSize = Math.max(140, width / 40);
  const mergedChildren = new Set(spaces.flatMap((room) => room.merge));
  for (const room of spaces) {
    if (mergedChildren.has(room.name)) continue;
    const members = spaces.filter((candidate) => candidate.compound === room.compound);
    let weight = 0;
    const center = { x: 0, y: 0 };
    for (const member of members) {
      const area = (member.bounds.maxX - member.bounds.minX) * (member.bounds.maxY - member.bounds.minY);
      center.x += (member.bounds.minX + member.bounds.maxX) / 2 * area;
      center.y += (member.bounds.minY + member.bounds.maxY) / 2 * area;
      weight += area;
    }
    if (weight > 0) {
      center.x /= weight;
      center.y /= weight;
    }
    output.push(text(center, frame, room.name, nameSize, 600));
    output.push(text({ x: center.x, y: center.y - nameSize * 1.25 }, frame, `${format(room.area / 1e6)} m²`, areaSize));
  }
  output.push("</svg>");
  return `${output.join("\n")}\n`;
}
