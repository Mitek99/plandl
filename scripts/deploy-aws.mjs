import { execFileSync } from "node:child_process";
import { readdirSync, utimesSync } from "node:fs";
import { join } from "node:path";

const bucket = process.env.PLANDL_AWS_BUCKET ?? "plandl-pages-164620743841-us-west-2";
const distribution = process.env.PLANDL_AWS_DISTRIBUTION ?? "EKCEZ0KPAOBOP";
const domain = process.env.PLANDL_AWS_DOMAIN ?? "plandl.org";
const region = process.env.PLANDL_AWS_REGION ?? "us-west-2";
// Deploys run as the app-deployer IAM user unless another profile is named, so an expired
// personal login (the default profile) never gets in the way.
const profile = process.env.PLANDL_AWS_PROFILE ?? process.env.AWS_PROFILE ?? "app-deployer";
const environment = { ...process.env, AWS_PROFILE: profile, AWS_REGION: region, PLANDL_BASE_URL: `https://${domain}/` };

// Fail before building if the profile has no usable credentials.
let identity;
try {
  identity = execFileSync("aws", ["sts", "get-caller-identity", "--query", "Arn", "--output", "text"], {
    encoding: "utf8",
    env: environment,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
} catch (error) {
  console.error(`AWS profile "${profile}" has no valid credentials: ${String(error.stderr ?? error.message).trim()}`);
  console.error("Add it to ~/.aws/credentials, or set PLANDL_AWS_PROFILE to a profile that can deploy.");
  process.exit(1);
}
console.log(`Deploying to https://${domain}/ as ${identity} (profile ${profile}).`);

execFileSync("npm", ["run", "site:build"], { stdio: "inherit", env: environment });
// Hugo keeps the modification times of static files, so s3 sync would skip unchanged ones and leave them with
// whatever metadata they were first uploaded with. Touching every file uploads the whole site (under 2 MB)
// on each deploy, so every object gets the Cache-Control header below.
const now = new Date();
for (const entry of readdirSync("docs/public", { recursive: true, withFileTypes: true })) {
  if (entry.isFile()) utimesSync(join(entry.parentPath, entry.name), now, now);
}
// Upload in three passes so every object carries a Cache-Control header (CloudFront and browsers honour it):
// 1. Hugo's fingerprinted bundles change name when their content changes, so they can be cached for a year.
// 2. Pages and other documents whose URL never changes are revalidated after five minutes.
// 3. Everything else (unfingerprinted CSS and scripts, plan drawings, icons) is cached for an hour.
// A last pass deletes objects that are no longer built. It compares sizes only, so it uploads nothing.
const sync = (...args) =>
  execFileSync("aws", ["s3", "sync", "docs/public", `s3://${bucket}`, ...args], { stdio: "inherit", env: environment });
const immutable = ["css/compiled/*", "js/*.min.*"];
const documents = ["*.html", "*.xml", "*.txt", "*.json", "*.webmanifest"];
const flags = (flag, patterns) => patterns.flatMap((pattern) => [flag, pattern]);
sync("--exclude", "*", ...flags("--include", immutable), "--cache-control", "public, max-age=31536000, immutable");
sync("--exclude", "*", ...flags("--include", documents), "--cache-control", "public, max-age=300");
sync(...flags("--exclude", [...immutable, ...documents]), "--cache-control", "public, max-age=3600");
sync("--delete", "--size-only");
const invalidation = execFileSync(
  "aws",
  ["cloudfront", "create-invalidation", "--distribution-id", distribution, "--paths", "/*", "--query", "Invalidation.Id", "--output", "text"],
  { encoding: "utf8", env: environment }
).trim();
console.log(`Published https://${domain}/ with CloudFront invalidation ${invalidation}.`);
