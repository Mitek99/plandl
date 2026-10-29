import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { build } from "esbuild";

const cli = "modules/cli/dist/cli.js";
const outputDirectory = "docs/static/examples";
mkdirSync(outputDirectory, { recursive: true });

for (const example of ["open-plan", "terrace", "auto-extend"]) {
  const source = `examples/${example}.plandl`;
  execFileSync(process.execPath, [cli, "check", source], { stdio: "inherit" });
  execFileSync(process.execPath, [cli, "compile", source, "--output", `${outputDirectory}/${example}.svg`], { stdio: "inherit" });
}

const defaults = execFileSync(process.execPath, [cli, "defaults", "--json"], { encoding: "utf8" });
const specification = execFileSync(process.execPath, [cli, "spec"], { encoding: "utf8" });
writeFileSync("docs/static/defaults.json", defaults);
writeFileSync("docs/static/spec.txt", specification);

await build({
  entryPoints: ["modules/playground/src/index.ts"],
  outfile: "docs/static/playground.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true
});
