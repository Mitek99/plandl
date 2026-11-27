import { accessOf, OUTSIDE } from "@plandl/core";
import type { Definition, PlanDocument, ResolvedPlan } from "@plandl/core";

// `plandl infer` rewrites each definition line with the facts the compiler computed, after INFER.
// Existing INFER values on those lines are replaced; everything before INFER is kept as written.
// Lines that start with INFER (generated counterparts) and comments are left untouched.

function metres(value: number): string {
  return `${Number((value / 1000).toFixed(3))}m`;
}

function squareMetres(value: number): string {
  return `${Number((value / 1e6).toFixed(2))}sqm`;
}

function millimetres(value: number): string {
  return `${Math.round(value)}mm`;
}

function list(values: string[]): string {
  return `[${values.join(",")}]`;
}

function facts(definition: Definition, plan: ResolvedPlan): string[] {
  if (definition.kind === "grid" && plan.grid) {
    const grid = plan.grid;
    return [
      `OUTER_DIMENSIONS=${list(grid.outerDimensions.map(metres))}`,
      `OUTER_AREA=${squareMetres(grid.outerArea)}`,
      `PERIMETER=${metres(grid.perimeter)}`
    ];
  }
  if (definition.kind === "room" || definition.kind === "terrace") {
    const room = [...plan.rooms, ...plan.terraces].find((candidate) => candidate.name === definition.name);
    if (!room) return [];
    const result: string[] = [];
    if (room.innerDimensions) result.push(`INNER_DIMENSIONS=${list(room.innerDimensions.map(metres))}`);
    result.push(`AREA=${squareMetres(room.area)}`);
    result.push(`ACCESS=${list(accessOf(plan, room.name))}`);
    return result;
  }
  if (definition.kind === "furniture") {
    if (definition.depth) return [];
    const furniture = plan.furniture.find((candidate) => candidate.location.line === definition.location.line);
    return furniture ? [`DEPTH=${millimetres(furniture.depth)}`] : [];
  }
  if (definition.kind === "opening" && !definition.isInferred && definition.openingType !== "WINDOW") {
    const opening = plan.openings.find((candidate) => !candidate.inferred && candidate.location.line === definition.location.line);
    const connection = plan.connections.find((candidate) => candidate.location.line === definition.location.line);
    if (!opening) return [];
    const result: string[] = [];
    if (definition.between) {
      result.push(`WALL=${opening.wall}`, `OFFSET=${millimetres(opening.offset)}`);
      if (opening.type === "DOOR") result.push(`HINGE=${opening.hinge}`, `OPENING=${opening.swing}`);
    }
    if (connection) {
      result.push(`CONNECTS=${list(connection.rooms)}`);
      if (connection.swingsInto) result.push(`SWINGS_INTO=${connection.swingsInto === OUTSIDE ? OUTSIDE : connection.swingsInto}`);
    }
    return result;
  }
  return [];
}

/** Split a line into its content and a trailing comment (a # outside double quotes). */
function splitComment(line: string): [string, string] {
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (char === '"' && line[index - 1] !== "\\") quoted = !quoted;
    if (char === "#" && !quoted) return [line.slice(0, index), line.slice(index)];
  }
  return [line, ""];
}

/** Remove an existing INFER modifier (not a leading INFER, not a key named INFER) and everything after it. */
function stripInferred(content: string): string {
  const pattern = /\sINFER(?=\s|$)(?!\s*=)/g;
  const leading = content.trimStart().startsWith("INFER");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    if (leading && content.slice(0, match.index).trim() === "") continue;
    return content.slice(0, match.index);
  }
  return content;
}

export function inferSource(source: string, document: PlanDocument, plan: ResolvedPlan): string {
  const lines = source.split(/\r?\n/);
  for (const definition of document.definitions) {
    if (definition.kind === "opening" && definition.isInferred) continue;
    const computed = facts(definition, plan);
    if (computed.length === 0) continue;
    const lineIndex = definition.location.line - 1;
    const [content, comment] = splitComment(lines[lineIndex] ?? "");
    const base = stripInferred(content).trimEnd();
    lines[lineIndex] = `${base} INFER ${computed.join(" ")}${comment ? ` ${comment.trim()}` : ""}`;
  }
  return lines.join("\n");
}
