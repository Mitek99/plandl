---
title: Getting started
weight: 2
---

## Requirements

- Node.js 26.13.0 or newer.
- npm.
- Hugo Extended 0.146 or newer for documentation development. The project uses 0.156.0.

## Build the tools

```sh
nvm use
npm install
npm run build
```

## Check and render a plan

```sh
node modules/cli/dist/cli.js check examples/open-plan.plandl
node modules/cli/dist/cli.js compile examples/open-plan.plandl -o open-plan.svg
```

`check` returns a nonzero exit status when validation fails. Add `--json` for machine-readable diagnostics.

## Inspect the resolved model

```sh
node modules/cli/dist/cli.js describe examples/open-plan.plandl
node modules/cli/dist/cli.js defaults --json
node modules/cli/dist/cli.js spec
```

`describe` emits normalized JSON with resolved coordinates, dimensions, hosts, room boundaries, areas, and diagnostics. The coordinates are compiler output; absolute coordinates are not accepted in PlanDL source.

## Build the documentation

```sh
npm run site:build
npm run site:serve
```

Site generation revalidates both examples before producing their SVGs. The production site is written to `docs/public/`.
