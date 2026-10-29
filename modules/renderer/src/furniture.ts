import type { Point, ResolvedObject, ResolvedWall } from "@plandl/core";
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

function counter(width: number, height: number): string {
  const shapes = [rect(0, 0, width, height)];
  for (let index = 1; index < 4; index += 1) {
    shapes.push(line(width * index / 4, 0, width * index / 4, height));
  }
  const burnerX = width * 0.14;
  const burnerY = height * 0.3;
  for (const x of [burnerX, width * 0.25]) {
    for (const y of [burnerY, height * 0.7]) {
      shapes.push(ellipse(x, y, width * 0.04, height * 0.14));
    }
  }
  shapes.push(rect(width * 0.58, height * 0.2, width * 0.3, height * 0.6, FILLED_DETAIL, height * 0.1));
  shapes.push(ellipse(width * 0.73, height * 0.5, width * 0.09, height * 0.2));
  shapes.push(path(`M ${format(width * 0.73)} ${format(height * 0.18)} v ${format(-height * 0.12)} h ${format(width * 0.07)}`));
  return shapes.join("");
}

function sofa(width: number, height: number): string {
  const shapes = [rect(0, 0, width, height, OUTLINE, height * 0.08)];
  shapes.push(rect(0, 0, width, height * 0.2, FILLED_DETAIL, height * 0.05));
  shapes.push(rect(0, height * 0.15, width * 0.1, height * 0.85, FILLED_DETAIL, height * 0.04));
  shapes.push(rect(width * 0.9, height * 0.15, width * 0.1, height * 0.85, FILLED_DETAIL, height * 0.04));
  const cushions = width > 2200 ? 3 : 2;
  for (let index = 1; index < cushions; index += 1) {
    const x = width * 0.1 + width * 0.8 * index / cushions;
    shapes.push(line(x, height * 0.22, x, height * 0.9));
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

function bed(width: number, height: number): string {
  const shapes = [rect(0, 0, width, height, OUTLINE, Math.min(width, height) * 0.04)];
  shapes.push(rect(0, 0, width, height * 0.05, FILLED_DETAIL));
  shapes.push(rect(width * 0.1, height * 0.09, width * 0.35, height * 0.17, FILLED_DETAIL, height * 0.04));
  shapes.push(rect(width * 0.55, height * 0.09, width * 0.35, height * 0.17, FILLED_DETAIL, height * 0.04));
  shapes.push(line(0, height * 0.36, width, height * 0.36));
  shapes.push(path(`M 0 ${format(height * 0.42)} L ${format(width * 0.48)} ${format(height * 0.7)} L ${format(width)} ${format(height * 0.42)}`));
  shapes.push(line(width * 0.48, height * 0.7, width * 0.48, height));
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

function chair(width: number, height: number): string {
  return chairSymbol(0, 0, width, height);
}

function wc(width: number, height: number): string {
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

function wardrobe(width: number, height: number): string {
  const shapes = [rect(0, 0, width, height)];
  const divisions = Math.max(3, Math.round(width / 250));
  for (let index = 1; index < divisions; index += 1) {
    shapes.push(line(width * index / divisions, 0, width * index / divisions, height));
  }
  shapes.push(line(0, height, width, 0));
  return shapes.join("");
}

function stove(width: number, height: number): string {
  const shapes = [rect(0, 0, width, height)];
  for (const x of [width * 0.28, width * 0.72]) {
    for (const y of [height * 0.28, height * 0.72]) {
      shapes.push(ellipse(x, y, width * 0.16, height * 0.16, OUTLINE));
      shapes.push(ellipse(x, y, width * 0.09, height * 0.09));
    }
  }
  return shapes.join("");
}

function symbol(object: ResolvedObject): string | null {
  const [width, height] = object.size;
  switch (object.objectType) {
    case "COUNTER": return counter(width, height);
    case "SOFA": return sofa(width, height);
    case "TABLE": return table(width, height);
    case "BED": return bed(width, height);
    case "SINK": return sink(width, height);
    case "CHAIR": return chair(width, height);
    case "WC": return wc(width, height);
    case "BATH": return bath(width, height);
    case "WARDROBE": return wardrobe(width, height);
    case "STOVE": return stove(width, height);
    default: return null;
  }
}

function transform(object: ResolvedObject, host: ResolvedWall, frame: Frame): string {
  const along = { x: (host.end.x - host.start.x) / host.length, y: (host.end.y - host.start.y) / host.length };
  const normal = object.side === "LEFT" ? { x: -along.y, y: along.x } : { x: along.y, y: -along.x };
  const faceOffset = object.side === "RIGHT" ? host.thickness + object.gap : object.gap;
  const start: Point = {
    x: host.start.x + along.x * object.offset + normal.x * faceOffset,
    y: host.start.y + along.y * object.offset + normal.y * faceOffset
  };
  const projected = { x: start.x - frame.minX + frame.margin, y: frame.maxY - start.y + frame.margin };
  return `matrix(${format(along.x)} ${format(-along.y)} ${format(normal.x)} ${format(-normal.y)} ${format(projected.x)} ${format(projected.y)})`;
}

export function renderFurniture(object: ResolvedObject, host: ResolvedWall, frame: Frame): string | null {
  const content = symbol(object);
  if (!content) return null;
  return `<g data-furniture="${object.objectType}" transform="${transform(object, host, frame)}">${content}</g>`;
}
