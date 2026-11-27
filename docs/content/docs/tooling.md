---
title: Tooling
weight: 6
---

PlanDL provides deterministic output, normalized data, structured diagnostics, generated examples, and a compact specification suitable for agent workflows.

## npm workspaces

| Package | Responsibility |
|---|---|
| `@plandl/parser` | Tokenizes and parses line-oriented commands and `KEY=value` parameters into an AST. |
| `@plandl/core` | Provides types, defaults, grid and room resolution, inference, normalized JSON, and validation. |
| `@plandl/renderer` | Produces deterministic SVG from a valid resolved plan. |
| `@plandl/cli` | Exposes the parser, resolver, validator, and renderer as command-line tools. |
| `@plandl/playground` | Runs the same packages in the browser for the front-page live editor. |

## Commands

```text
plandl check <file> [--json]
plandl compile <file> [--output file.svg] [--grid]
plandl describe <file>
plandl defaults [--json]
plandl spec
```

In this repository, invoke the CLI with `node modules/cli/dist/cli.js` after `npm run build`.

`compile` writes SVG to standard output unless `--output` or `-o` is supplied. `--grid` also draws the grid lines with numbered markers, X along the top and Y down the left, matching the indexes rooms use. The documentation renders plans in the browser with the same renderer and a Grid lines toggle. `describe` writes the complete resolved model. `spec` prints the compact grammar and semantic rules; a generated copy is available at [spec.txt](../../spec.txt).

## Furniture symbols

The renderer includes pictograms for `BED`, `DESK`, `CABINET`, `SINK`, `FRIDGE`, `OVEN`, `SOFA`, `TABLE`, `ISLAND`, `TOILET`, `SHOWER`, and `BATHTUB`. Symbols use the declared footprint and rotate to point into the room from the host wall.

## Deliberate non-goals

The current toolchain does not attempt off-grid or curved geometry, DXF/PDF export, IFC/BIM exchange, automatic layout, a runtime scripting language, a plugin system, or architectural habitability analysis.
