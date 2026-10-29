---
title: Tooling
weight: 6
---

PlanDL uses ArchLang's tooling philosophy as a reference: deterministic output, normalized data, structured diagnostics, generated examples, and a compact specification suitable for agent workflows. Its implementation and scope are intentionally much smaller.

## npm workspaces

| Package | Responsibility |
|---|---|
| `@plandl/parser` | Tokenizes and parses the line-oriented source into an AST. |
| `@plandl/core` | Provides types, defaults, sequential resolution, normalized JSON, and geometric validation. |
| `@plandl/renderer` | Produces deterministic SVG from a valid resolved plan. |
| `@plandl/cli` | Exposes the parser, resolver, validator, and renderer as command-line tools. |
| `@plandl/playground` | Runs the same packages in the browser for the front-page live editor. |

## Commands

```text
plandl check <file> [--json]
plandl compile <file> [--output file.svg]
plandl describe <file>
plandl defaults [--json]
plandl spec
```

In this repository, invoke the CLI with `node modules/cli/dist/cli.js` after `npm run build`.

`compile` writes SVG to standard output unless `--output` or `-o` is supplied. `describe` writes the complete resolved model. `spec` prints the compact grammar and semantic rules; a generated copy is available at [spec.txt](../../spec.txt).

## Deliberate non-goals

The current toolchain does not attempt DXF/PDF export, IFC/BIM exchange, automatic layout, a runtime scripting language, a plugin system, a large fixture catalogue, or architectural habitability analysis.
