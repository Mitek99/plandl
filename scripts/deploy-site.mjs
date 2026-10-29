import { execFileSync } from "node:child_process";

const repository = process.env.PLANDL_REPOSITORY ?? "Mitek99/plandl";
const gh = (args, options = {}) => execFileSync("gh", args, { encoding: "utf8", ...options });

try {
  gh(["api", `repos/${repository}/pages`], { stdio: "pipe" });
} catch {
  gh(["api", `repos/${repository}/pages`, "--method", "POST", "-f", "build_type=workflow"], { stdio: "inherit" });
}
gh(["workflow", "run", "pages.yml", "--repo", repository], { stdio: "inherit" });
console.log(`Pages deployment requested for ${repository}.`);
