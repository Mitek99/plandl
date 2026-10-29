# PlanDL

PlanDL is a small, strict, LLM-friendly language for relative spatial plans. Plans are built from sequential wall references, explicit room boundaries, typed openings, and wall-attached objects. Source contains no absolute coordinates.

[ArchLang](https://github.com/ChanMeng666/archlang) is a more advanced floor-plan language and compiler. PlanDL deliberately stays smaller: a compact wall graph, deterministic validation, normalized JSON, and SVG output. It is not trying to boil the ocean or replace BIM.

## Quick start

PlanDL requires Node.js 26.13.0 or newer.

```sh
nvm use
npm install
npm run build
node modules/cli/dist/cli.js check examples/open-plan.plandl
node modules/cli/dist/cli.js compile examples/open-plan.plandl -o open-plan.svg
```

Other commands:

```sh
node modules/cli/dist/cli.js describe examples/open-plan.plandl
node modules/cli/dist/cli.js defaults
node modules/cli/dist/cli.js spec
```

## Example

```text
LET width = 6000mm
LET depth = 4000mm

WALL EXTERNAL south "South exterior" DIRECTION 90 LENGTH width
WALL EXTERNAL east "East exterior" START south.end DIRECTION 0 LENGTH depth
WALL EXTERNAL north "North exterior" START east.end DIRECTION 270 LENGTH width
WALL EXTERNAL west "West exterior" START north.end DIRECTION 180 LENGTH depth

ROOM studio "Studio" WALLS [south, east, north, west]
```

The first wall starts at an implicit origin. Every later wall attaches to an earlier wall. The validator resolves T-junctions, checks room closure, and rejects wall crossings and overlaps.

## Repository layout

- `modules/parser` — line-oriented DSL parser.
- `modules/core` — defaults, sequential resolver, normalized model, and geometry validation.
- `modules/renderer` — deterministic SVG renderer.
- `modules/cli` — `check`, `compile`, `describe`, `defaults`, and `spec` commands.
- `examples` — complete open-plan and terrace examples.
- `docs` — Hugo/Hextra documentation site.
- `scripts` — example generation, site builds, preview, and Pages deployment.

## Documentation development

A Hugo Extended version compatible with current Hextra is required (0.146 or newer; the project uses 0.156.0).

```sh
npm run build
npm run site:build
npm run site:serve
```

`npm run site:generate` validates the examples and regenerates their SVGs plus the machine-readable defaults and compact specification used by the site.

## Project scope

The initial release supports straight walls, variables and formulas, sequential relative placement, rooms, doors, windows, openings, simple attached objects, normalized JSON, validation, and SVG. It does not currently target DXF/PDF, IFC, automatic layout, curved geometry, full BIM semantics, or a large symbol catalogue.
