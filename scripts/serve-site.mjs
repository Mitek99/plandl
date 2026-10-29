import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

execFileSync(process.execPath, ["scripts/generate-site.mjs"], { stdio: "inherit" });
const localHugo = ".tools/hugo/hugo";
const hugo = process.env.HUGO_BIN ?? (existsSync(localHugo) ? localHugo : "hugo");
execFileSync(hugo, ["server", "--source", "docs", "--buildDrafts", "--disableFastRender", "--bind", "127.0.0.1"], { stdio: "inherit" });
