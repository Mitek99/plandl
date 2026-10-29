import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DEFAULT_DEFINITIONS, PLANDL_SPEC, resolvePlan } from "@plandl/core";
import type { Diagnostic, ResolvedPlan } from "@plandl/core";
import { parsePlan } from "@plandl/parser";
import { renderSvg } from "@plandl/renderer";

const USAGE = `Usage: plandl <command> [arguments]

Commands:
  check <file> [--json]       Parse and validate a plan
  compile <file> [-o file]    Render a plan as deterministic SVG
  describe <file>             Write normalized resolved JSON
  defaults [--json]           List built-in default variables
  spec                        Print the compact language specification
`;

function load(file: string): ResolvedPlan {
  const parsed = parsePlan(readFileSync(file, "utf8"));
  return resolvePlan(parsed.document, parsed.diagnostics);
}

function errors(plan: ResolvedPlan): Diagnostic[] {
  return plan.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
}

function printDiagnostics(file: string, diagnostics: Diagnostic[]): void {
  for (const diagnostic of diagnostics) {
    const location = diagnostic.location ? `:${diagnostic.location.line}:${diagnostic.location.column}` : "";
    console.error(`${file}${location}: ${diagnostic.code} ${diagnostic.message}`);
  }
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
    if (command === "check" || command === "compile" || command === "describe") {
      const file = rest[0];
      if (!file || file.startsWith("-")) {
        process.stderr.write(USAGE);
        return 2;
      }
      const plan = load(file);
      const diagnostics = errors(plan);
      if (command === "describe") {
        console.log(JSON.stringify(plan, null, 2));
        return diagnostics.length > 0 ? 1 : 0;
      }
      if (command === "check") {
        if (rest.includes("--json")) {
          console.log(JSON.stringify({ valid: diagnostics.length === 0, diagnostics: plan.diagnostics }, null, 2));
        } else if (diagnostics.length === 0) {
          console.log(`${file}: valid`);
        } else {
          printDiagnostics(file, plan.diagnostics);
        }
        return diagnostics.length > 0 ? 1 : 0;
      }
      if (diagnostics.length > 0) {
        printDiagnostics(file, plan.diagnostics);
        return 1;
      }
      const svg = renderSvg(plan);
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
