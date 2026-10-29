import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

execFileSync(process.execPath, ["scripts/generate-site.mjs"], { stdio: "inherit" });
const localHugo = ".tools/hugo/hugo";
const hugo = process.env.HUGO_BIN ?? (existsSync(localHugo) ? localHugo : "hugo");
const args = ["--source", "docs", "--destination", "public", "--gc", "--minify"];
if (process.env.PLANDL_BASE_URL) {
  args.push("--baseURL", process.env.PLANDL_BASE_URL);
}
execFileSync(hugo, args, { stdio: "inherit" });
