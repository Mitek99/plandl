import { execFileSync } from "node:child_process";

const bucket = process.env.PLANDL_AWS_BUCKET ?? "plandl-pages-164620743841-us-west-2";
const distribution = process.env.PLANDL_AWS_DISTRIBUTION ?? "EKCEZ0KPAOBOP";
const domain = process.env.PLANDL_AWS_DOMAIN ?? "d3eb034fkslao0.cloudfront.net";
const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-west-2";
const environment = { ...process.env, AWS_REGION: region, PLANDL_BASE_URL: `https://${domain}/` };

execFileSync("npm", ["run", "site:build"], { stdio: "inherit", env: environment });
execFileSync("aws", ["s3", "sync", "docs/public", `s3://${bucket}`, "--delete"], { stdio: "inherit", env: environment });
const invalidation = execFileSync(
  "aws",
  ["cloudfront", "create-invalidation", "--distribution-id", distribution, "--paths", "/*", "--query", "Invalidation.Id", "--output", "text"],
  { encoding: "utf8", env: environment }
).trim();
console.log(`Published https://${domain}/ with CloudFront invalidation ${invalidation}.`);
