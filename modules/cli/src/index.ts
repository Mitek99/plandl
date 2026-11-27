import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DEFAULT_DEFINITIONS, PLANDL_SPEC, resolvePlan, summarizePlan } from "@plandl/core";
import type { Diagnostic, PlanDocument, ResolvedPlan } from "@plandl/core";
import { parsePlan } from "@plandl/parser";
import { renderSvg } from "@plandl/renderer";
import { inferSource } from "./infer.js";

const USAGE = `Usage: plandl <command> [arguments]

Commands:
  check <file> [--json] [--strict] [--quiet]
                              Validate a plan, list warnings, and print a room table.
                              --strict fails on warnings; --quiet omits the room table
  infer <file> [--write | -o file]
                              Write computed facts back into the source after INFER
  compile <file> [-o file] [--grid]
                              Render a plan as deterministic SVG, optionally with grid lines
  describe <file>             Write normalized resolved JSON
  defaults [--json]           List default wall thicknesses
  spec                        Print the compact language specification
`;

function load(file: string): { plan: ResolvedPlan; document: PlanDocument; source: string } {
  const source = readFileSync(file, "utf8");
  const parsed = parsePlan(source);
  return { plan: resolvePlan(parsed.document, parsed.diagnostics), document: parsed.document, source };
}

function errors(plan: ResolvedPlan): Diagnostic[] {
  return plan.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
}

function warnings(plan: ResolvedPlan): Diagnostic[] {
  return plan.diagnostics.filter((diagnostic) => diagnostic.severity === "warning");
}

function formatDiagnostic(file: string, diagnostic: Diagnostic): string {
  const location = diagnostic.location ? `:${diagnostic.location.line}:${diagnostic.location.column}` : "";
  const severity = diagnostic.severity === "warning" ? "warning " : "";
  return `${file}${location}: ${severity}${diagnostic.code} ${diagnostic.message}`;
}

function printDiagnostics(file: string, diagnostics: Diagnostic[]): void {
  for (const diagnostic of diagnostics) console.error(formatDiagnostic(file, diagnostic));
}

function metres(value: number): string {
  return `${Number((value / 1000).toFixed(2))}`;
}

function roomTable(plan: ResolvedPlan): string {
  const summary = summarizePlan(plan);
  const rows = summary.rooms.map((room) => [
    room.name,
    room.type ?? "-",
    room.innerDimensions ? `${metres(room.innerDimensions[0])} x ${metres(room.innerDimensions[1])} m` : "compound",
    `${Number((room.area / 1e6).toFixed(2))} m²`,
    room.access.length > 0 ? room.access.join(", ") : "none",
    String(room.windows)
  ]);
  const header = ["ROOM", "TYPE", "INNER SIZE", "AREA", "ACCESS", "WINDOWS"];
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => row[column]!.length)));
  const format = (row: string[]): string => row.map((cell, column) => cell.padEnd(widths[column]!)).join("  ").trimEnd();
  const lines = [format(header), ...rows.map(format)];
  const share = summary.circulationArea > 0 ? `, circulation ${Math.round(summary.circulationShare * 100)}%` : "";
  lines.push(`Net area ${Number((summary.netArea / 1e6).toFixed(2))} m²${share}.`);
  return lines.join("\n");
}

function option(args: string[], name: string, short?: string): string | undefined {
  const index = args.findIndex((argument) => argument === name || argument === short);
  return index >= 0 ? args[index + 1] : undefined;
}

export function runCli(args: string[]): number {
  const [command, ...rest] = args;
  try {
    if (command === "spec") {
      process.stdout.write(PLANDL_SPEC);
      return 0;
    }
    if (command === "defaults") {
      if (rest.includes("--json")) {
        console.log(JSON.stringify(DEFAULT_DEFINITIONS, null, 2));
      } else {
        for (const entry of DEFAULT_DEFINITIONS) {
          console.log(`${entry.name} = ${entry.value}${entry.unit}  ${entry.description}`);
        }
      }
      return 0;
    }
    if (command === "infer") {
      const file = rest[0];
      if (!file || file.startsWith("-")) {
        process.stderr.write(USAGE);
        return 2;
      }
      const { plan, document, source } = load(file);
      if (errors(plan).length > 0) {
        printDiagnostics(file, plan.diagnostics);
        return 1;
      }
      const result = inferSource(source, document, plan);
      const output = rest.includes("--write") ? file : option(rest, "--output", "-o");
      if (output) {
        const path = resolve(output);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, result);
        console.log(output);
      } else {
        process.stdout.write(result);
      }
      return 0;
    }
    if (command === "check" || command === "compile" || command === "describe") {
      const file = rest[0];
      if (!file || file.startsWith("-")) {
        process.stderr.write(USAGE);
        return 2;
      }
      const { plan } = load(file);
      const diagnostics = errors(plan);
      if (command === "describe") {
        console.log(JSON.stringify(plan, null, 2));
        return diagnostics.length > 0 ? 1 : 0;
      }
      if (command === "check") {
        const warned = warnings(plan);
        const strict = rest.includes("--strict");
        if (rest.includes("--json")) {
          console.log(JSON.stringify({
            valid: diagnostics.length === 0,
            warnings: warned.length,
            diagnostics: plan.diagnostics,
            summary: diagnostics.length === 0 ? summarizePlan(plan) : undefined
          }, null, 2));
        } else if (diagnostics.length === 0) {
          console.log(`${file}: valid${warned.length > 0 ? `, ${warned.length} ${warned.length === 1 ? "warning" : "warnings"}` : ""}`);
          for (const warning of warned) console.log(formatDiagnostic(file, warning));
          if (!rest.includes("--quiet")) console.log(`\n${roomTable(plan)}`);
        } else {
          printDiagnostics(file, plan.diagnostics);
        }
        if (diagnostics.length > 0) return 1;
        return strict && warned.length > 0 ? 1 : 0;
      }
      if (diagnostics.length > 0) {
        printDiagnostics(file, plan.diagnostics);
        return 1;
      }
      const svg = renderSvg(plan, { grid: rest.includes("--grid") });
      const output = option(rest, "--output", "-o");
      if (output) {
        const path = resolve(output);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, svg);
        console.log(output);
      } else {
        process.stdout.write(svg);
      }
      return 0;
    }
    process.stderr.write(USAGE);
    return command === undefined || command === "help" || command === "--help" || command === "-h" ? 0 : 2;
  } catch (error) {
    console.error(`plandl: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}
