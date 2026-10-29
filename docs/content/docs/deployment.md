---
title: AWS deployment
weight: 7
---

The production documentation is available at [https://d3eb034fkslao0.cloudfront.net/](https://d3eb034fkslao0.cloudfront.net/).

## Architecture

- S3 bucket `plandl-pages-164620743841-us-west-2` in `us-west-2`, with encryption and all public access blocked.
- CloudFront distribution `EKCEZ0KPAOBOP` with HTTPS redirect and a managed caching policy.
- Origin access control allows only this distribution to read the bucket.
- CloudFront Function `plandl-directory-index` maps directory URLs to Hugo's `index.html` documents.

S3 and CloudFront usage can incur AWS charges.

## Publish

With Node.js, Hugo Extended, and AWS credentials configured:

```sh
npm run site:deploy:aws
```

The command builds with the CloudFront base URL, validates and regenerates the examples, synchronizes `docs/public/` to S3, removes stale objects, and creates a `/*` CloudFront invalidation.

The defaults can be overridden with `PLANDL_AWS_BUCKET`, `PLANDL_AWS_DISTRIBUTION`, `PLANDL_AWS_DOMAIN`, and `AWS_REGION`.
