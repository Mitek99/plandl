import { execFileSync } from "node:child_process";

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
// Upload in three passes so every object carries a Cache-Control header (CloudFront and browsers honour it):
// 1. Hugo's fingerprinted bundles change name when their content changes, so they can be cached for a year.
// 2. Pages and other documents whose URL never changes are revalidated after five minutes.
// 3. Everything else (unfingerprinted CSS and scripts, plan drawings, icons) is cached for an hour. This pass
//    also deletes objects that are no longer built; files uploaded by the first two passes are newer in S3
//    than on disk, so it skips them.
const sync = (...args) =>
  execFileSync("aws", ["s3", "sync", "docs/public", `s3://${bucket}`, ...args], { stdio: "inherit", env: environment });
sync("--exclude", "*", "--include", "css/compiled/*", "--include", "js/*.min.*", "--cache-control", "public, max-age=31536000, immutable");
sync(
  "--exclude", "*",
  ...["*.html", "*.xml", "*.txt", "*.json", "*.webmanifest"].flatMap((pattern) => ["--include", pattern]),
  "--cache-control", "public, max-age=300"
);
sync("--delete", "--cache-control", "public, max-age=3600");
const invalidation = execFileSync(
  "aws",
  ["cloudfront", "create-invalidation", "--distribution-id", distribution, "--paths", "/*", "--query", "Invalidation.Id", "--output", "text"],
  { encoding: "utf8", env: environment }
).trim();
console.log(`Published https://${domain}/ with CloudFront invalidation ${invalidation}.`);
