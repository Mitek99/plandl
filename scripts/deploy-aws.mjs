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
execFileSync("aws", ["s3", "sync", "docs/public", `s3://${bucket}`, "--delete"], { stdio: "inherit", env: environment });
const invalidation = execFileSync(
  "aws",
  ["cloudfront", "create-invalidation", "--distribution-id", distribution, "--paths", "/*", "--query", "Invalidation.Id", "--output", "text"],
  { encoding: "utf8", env: environment }
).trim();
console.log(`Published https://${domain}/ with CloudFront invalidation ${invalidation}.`);
