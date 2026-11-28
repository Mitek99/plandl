---
title: AWS deployment
description: "How the PlanDL documentation site is built with Hugo and published to Amazon S3 behind CloudFront at plandl.org."
weight: 8
---

The production documentation is available at [https://plandl.org/](https://plandl.org/).

## Architecture

- S3 bucket `plandl-pages-164620743841-us-west-2` in `us-west-2`, with encryption and all public access blocked.
- CloudFront distribution `EKCEZ0KPAOBOP` with HTTPS redirect and a managed caching policy. It serves `plandl.org` and `www.plandl.org` with an ACM certificate from `us-east-1`; its default domain is `d3eb034fkslao0.cloudfront.net`.
- DNS for `plandl.org` is hosted at Porkbun: an `ALIAS` record for the root domain and a `CNAME` for `www`, both pointing to the CloudFront domain, plus the ACM validation `CNAME` records.
- Origin access control allows only this distribution to read the bucket.
- CloudFront Function `plandl-directory-index` maps directory URLs to Hugo's `index.html` documents.

S3 and CloudFront usage can incur AWS charges.

## Publish

With Node.js and Hugo Extended installed:

```sh
npm run site:deploy:aws
```

The command first confirms the AWS credentials work, then builds with the `plandl.org` base URL, validates and regenerates the examples, synchronizes `docs/public/` to S3, removes stale objects, and creates a `/*` CloudFront invalidation.

Deploys run as the `app-deployer` IAM user, from the `app-deployer` profile in `~/.aws/credentials`, so an expired personal sign-in does not get in the way. To use another profile, set `PLANDL_AWS_PROFILE` (or `AWS_PROFILE`). The deploy needs exactly these permissions:

| Service | Actions | Resource |
|---|---|---|
| S3 | `s3:ListBucket` | the bucket |
| S3 | `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` | objects in the bucket |
| CloudFront | `cloudfront:CreateInvalidation`, `cloudfront:GetInvalidation`, `cloudfront:ListInvalidations`, `cloudfront:GetDistribution` | the distribution |
| STS | `sts:GetCallerIdentity` | (always allowed) |

`app-deployer` has all of them. One-time changes, such as adding a domain to CloudFront or requesting a certificate, need an administrator sign-in instead.

The other defaults can be overridden with `PLANDL_AWS_BUCKET`, `PLANDL_AWS_DISTRIBUTION`, `PLANDL_AWS_DOMAIN`, and `PLANDL_AWS_REGION`.
