import type { ResolvedFurniture } from "@plandl/core";
import type { Frame } from "./frame.js";

const OUTLINE = 'fill="white" stroke="#2d3748" stroke-width="26" stroke-linejoin="round"';
const DETAIL = 'fill="none" stroke="#2d3748" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"';
const FILLED_DETAIL = 'fill="#e2e8f0" stroke="#2d3748" stroke-width="20" stroke-linejoin="round"';

function format(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function rect(x: number, y: number, width: number, height: number, attributes = OUTLINE, radius = 0): string {
  return `<rect x="${format(x)}" y="${format(y)}" width="${format(width)}" height="${format(height)}" rx="${format(radius)}" ${attributes}/>`;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, attributes = DETAIL): string {
  return `<ellipse cx="${format(cx)}" cy="${format(cy)}" rx="${format(rx)}" ry="${format(ry)}" ${attributes}/>`;
}

function line(x1: number, y1: number, x2: number, y2: number, attributes = DETAIL): string {
  return `<line x1="${format(x1)}" y1="${format(y1)}" x2="${format(x2)}" y2="${format(y2)}" ${attributes}/>`;
}

function path(data: string, attributes = DETAIL): string {
  return `<path d="${data}" ${attributes}/>`;
}

function bed(width: number, height: number): string {
  return [
    rect(0, 0, width, height, OUTLINE, Math.min(width, height) * 0.04),
    rect(0, 0, width, height * 0.05, FILLED_DETAIL),
    rect(width * 0.1, height * 0.09, width * 0.35, height * 0.17, FILLED_DETAIL, height * 0.04),
    rect(width * 0.55, height * 0.09, width * 0.35, height * 0.17, FILLED_DETAIL, height * 0.04),
    line(0, height * 0.36, width, height * 0.36),
    path(`M 0 ${format(height * 0.42)} L ${format(width * 0.48)} ${format(height * 0.7)} L ${format(width)} ${format(height * 0.42)}`),
    line(width * 0.48, height * 0.7, width * 0.48, height)
  ].join("");
}

function sofa(width: number, height: number): string {
  const shapes = [
    rect(0, 0, width, height, OUTLINE, height * 0.08),
    rect(0, 0, width, height * 0.2, FILLED_DETAIL, height * 0.05),
    rect(0, height * 0.15, width * 0.1, height * 0.85, FILLED_DETAIL, height * 0.04),
    rect(width * 0.9, height * 0.15, width * 0.1, height * 0.85, FILLED_DETAIL, height * 0.04)
  ];
  const cushions = width > 2200 ? 3 : 2;
  for (let index = 1; index < cushions; index += 1) {
    shapes.push(line(width * 0.1 + width * 0.8 * index / cushions, height * 0.22, width * 0.1 + width * 0.8 * index / cushions, height * 0.9));
  }
  shapes.push(line(width * 0.1, height * 0.82, width * 0.9, height * 0.82));
  return shapes.join("");
}

function chairSymbol(x: number, y: number, width: number, height: number): string {
  return [
    rect(x, y, width, height, OUTLINE, Math.min(width, height) * 0.08),
    line(x, y + height * 0.2, x + width, y + height * 0.2),
    line(x + width * 0.15, y + height * 0.85, x + width * 0.85, y + height * 0.85)
  ].join("");
}

function table(width: number, height: number): string {
  const shapes = [rect(width * 0.2, height * 0.2, width * 0.6, height * 0.6, FILLED_DETAIL)];
  for (const x of [width * 0.34, width * 0.56]) {
    shapes.push(chairSymbol(x, 0, width * 0.14, height * 0.18));
    shapes.push(chairSymbol(x, height * 0.82, width * 0.14, height * 0.18));
  }
  shapes.push(chairSymbol(0, height * 0.38, width * 0.18, height * 0.24));
  shapes.push(chairSymbol(width * 0.82, height * 0.38, width * 0.18, height * 0.24));
  return shapes.join("");
}

function sink(width: number, height: number): string {
  return [
    rect(0, 0, width, height, OUTLINE, Math.min(width, height) * 0.05),
    ellipse(width * 0.5, height * 0.58, width * 0.32, height * 0.26, FILLED_DETAIL),
    ellipse(width * 0.5, height * 0.16, width * 0.05, height * 0.05),
    path(`M ${format(width * 0.5)} ${format(height * 0.18)} v ${format(height * 0.12)}`)
  ].join("");
}

function toilet(width: number, height: number): string {
  return [
    rect(width * 0.15, 0, width * 0.7, height * 0.25, FILLED_DETAIL, width * 0.05),
    ellipse(width * 0.5, height * 0.6, width * 0.38, height * 0.36, OUTLINE),
    ellipse(width * 0.5, height * 0.62, width * 0.24, height * 0.23),
    ellipse(width * 0.5, height * 0.12, width * 0.04, height * 0.025)
  ].join("");
}

function bath(width: number, height: number): string {
  const radius = Math.min(width, height) * 0.15;
  return [
    rect(0, 0, width, height, OUTLINE, radius),
    rect(width * 0.1, height * 0.1, width * 0.8, height * 0.8, FILLED_DETAIL, radius),
    ellipse(width * 0.5, height * 0.82, width * 0.04, height * 0.025)
  ].join("");
}

function cabinet(width: number, height: number): string {
  const shapes = [rect(0, 0, width, height)];
  const divisions = Math.max(2, Math.round(width / 600));
  for (let index = 1; index < divisions; index += 1) {
    shapes.push(line(width * index / divisions, 0, width * index / divisions, height));
  }
  shapes.push(line(0, height, width, 0));
  return shapes.join("");
}

function oven(width: number, height: number): string {
  return [
    rect(0, 0, width, height),
    rect(width * 0.12, height * 0.3, width * 0.76, height * 0.58, FILLED_DETAIL, height * 0.03),
    line(width * 0.12, height * 0.16, width * 0.88, height * 0.16),
    ellipse(width * 0.25, height * 0.12, width * 0.04, height * 0.04),
    ellipse(width * 0.75, height * 0.12, width * 0.04, height * 0.04)
  ].join("");
}

function shower(width: number, height: number): string {
  return [
    rect(0, 0, width, height),
    line(0, 0, width, height),
    line(width, 0, 0, height),
    ellipse(width * 0.5, height * 0.5, width * 0.08, height * 0.08, FILLED_DETAIL)
  ].join("");
}

function wardrobe(width: number, height: number): string {
  // Hanging rail along the middle with coat hangers across it; doors face into the room (y = depth).
  const shapes = [rect(0, 0, width, height), line(width * 0.04, height * 0.5, width * 0.96, height * 0.5)];
  const hangers = Math.max(3, Math.round(width / 250));
  for (let index = 1; index < hangers; index += 1) {
    const x = width * index / hangers;
    shapes.push(line(x - height * 0.08, height * 0.25, x + height * 0.08, height * 0.75));
  }
  return shapes.join("");
}

function washer(width: number, height: number): string {
  const size = Math.min(width, height);
  return [
    rect(0, 0, width, height, OUTLINE, size * 0.06),
    line(0, height * 0.18, width, height * 0.18),
    ellipse(width * 0.5, height * 0.58, size * 0.3, size * 0.3, FILLED_DETAIL),
    ellipse(width * 0.5, height * 0.58, size * 0.18, size * 0.18)
  ].join("");
}

function dishwasher(width: number, height: number): string {
  const shapes = [rect(0, 0, width, height), rect(width * 0.1, height * 0.12, width * 0.8, height * 0.76, FILLED_DETAIL)];
  for (const y of [0.35, 0.5, 0.65]) shapes.push(line(width * 0.18, height * y, width * 0.82, height * y));
  return shapes.join("");
}

function fridge(width: number, height: number): string {
  return [
    rect(0, 0, width, height),
    rect(0, 0, width, height * 0.22, FILLED_DETAIL),
    line(width * 0.75, height * 0.4, width * 0.75, height * 0.85)
  ].join("");
}

function symbol(furniture: ResolvedFurniture): string {
  const { width, depth } = furniture;
  switch (furniture.type) {
    case "BED": return bed(width, depth);
    case "SOFA": return sofa(width, depth);
    case "TABLE": return table(width, depth);
    case "SINK": return sink(width, depth);
    case "TOILET": return toilet(width, depth);
    case "BATHTUB": return bath(width, depth);
    case "CABINET": return cabinet(width, depth);
    case "FRIDGE": return fridge(width, depth);
    case "WARDROBE": return wardrobe(width, depth);
    case "WASHER": return washer(width, depth);
    case "DISHWASHER": return dishwasher(width, depth);
    case "OVEN": return oven(width, depth);
    case "SHOWER": return shower(width, depth);
    case "DESK": return [rect(0, 0, width, depth), line(width * 0.1, depth * 0.25, width * 0.9, depth * 0.25)].join("");
    case "ISLAND": return [rect(0, 0, width, depth, FILLED_DETAIL), rect(width * 0.08, depth * 0.08, width * 0.84, depth * 0.84)].join("");
  }
}

function transform(furniture: ResolvedFurniture, frame: Frame): string {
  const start = furniture.footprint[0]!;
  const end = furniture.footprint[1]!;
  const last = furniture.footprint[3]!;
  const along = { x: (end.x - start.x) / furniture.width, y: (end.y - start.y) / furniture.width };
  const inward = { x: (last.x - start.x) / furniture.depth, y: (last.y - start.y) / furniture.depth };
  const projected = { x: start.x - frame.minX + frame.margin, y: frame.maxY - start.y + frame.margin };
  return `matrix(${format(along.x)} ${format(-along.y)} ${format(inward.x)} ${format(-inward.y)} ${format(projected.x)} ${format(projected.y)})`;
}

export function renderFurniture(furniture: ResolvedFurniture, frame: Frame): string {
  return `<g data-furniture="${furniture.type}" transform="${transform(furniture, frame)}">${symbol(furniture)}</g>`;
}
