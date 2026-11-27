import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { build } from "esbuild";

const cli = "modules/cli/dist/cli.js";
const outputDirectory = "docs/static/examples";
// Generated output only (gitignored): start clean so removed examples are not published.
rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

function checkAndCompile(source, output, { strict = true } = {}) {
  // Examples must pass with no warnings; tutorial steps may have warnings, which the page shows.
  execFileSync(process.execPath, [cli, "check", source, "--quiet", ...(strict ? ["--strict"] : [])], { stdio: "inherit" });
  execFileSync(process.execPath, [cli, "compile", source, "--output", output], { stdio: "inherit" });
}

function checkReport(source) {
  const result = JSON.parse(execFileSync(process.execPath, [cli, "check", source, "--json"], { encoding: "utf8" }));
  const warnings = result.diagnostics.filter((diagnostic) => diagnostic.severity === "warning");
  if (warnings.length === 0) return "valid, no warnings\n";
  return warnings.map((warning) => `line ${warning.location?.line ?? "-"}: ${warning.code} ${warning.message}`).join("\n") + "\n";
}

for (const example of ["open-plan", "terrace", "auto-extend", "reference-house"]) {
  checkAndCompile(`examples/${example}.plandl`, `${outputDirectory}/${example}.svg`);
  // The source is embedded in the page and rendered in the browser; the SVG is the no-JavaScript fallback.
  copyFileSync(`examples/${example}.plandl`, `${outputDirectory}/${example}.plandl`);
}

// Line diff (LCS) listing only removed and added lines, used to show what each step changes.
function changedLines(before, after) {
  const a = before.split("\n").filter((line) => line.trim() !== "");
  const b = after.split("\n").filter((line) => line.trim() !== "");
  const lengths = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lengths[i][j] = a[i] === b[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const lines = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      i += 1;
      j += 1;
    } else if (i < a.length && (j === b.length || lengths[i + 1][j] >= lengths[i][j + 1])) {
      lines.push(`- ${a[i]}`);
      i += 1;
    } else {
      lines.push(`+ ${b[j]}`);
      j += 1;
    }
  }
  return `${lines.join("\n")}\n`;
}

// The step-by-step tutorial: every step is a complete plan that must validate on its own.
const stepsDirectory = "examples/step-by-step";
const stepsOutput = `${outputDirectory}/step-by-step`;
mkdirSync(stepsOutput, { recursive: true });
let previous;
for (const file of readdirSync(stepsDirectory).filter((name) => name.endsWith(".plandl")).sort()) {
  const step = file.replace(/\.plandl$/, "");
  const source = `${stepsDirectory}/${file}`;
  checkAndCompile(source, `${stepsOutput}/${step}.svg`, { strict: false });
  copyFileSync(source, `${stepsOutput}/${file}`);
  writeFileSync(`${stepsOutput}/${step}.check`, checkReport(source));
  const text = readFileSync(source, "utf8");
  if (previous !== undefined) {
    writeFileSync(`${stepsOutput}/${step}.diff`, changedLines(previous, text));
  }
  previous = text;
}

const defaults = execFileSync(process.execPath, [cli, "defaults", "--json"], { encoding: "utf8" });
const specification = execFileSync(process.execPath, [cli, "spec"], { encoding: "utf8" });
writeFileSync("docs/static/defaults.json", defaults);
writeFileSync("docs/static/spec.txt", specification);

const browserBundle = { bundle: true, format: "iife", platform: "browser", target: "es2022", minify: true };
await build({ ...browserBundle, entryPoints: ["modules/playground/src/index.ts"], outfile: "docs/static/playground.js" });
await build({ ...browserBundle, entryPoints: ["modules/playground/src/viewer.ts"], outfile: "docs/static/viewer.js" });
