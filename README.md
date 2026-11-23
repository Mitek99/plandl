# PlanDL

PlanDL is a small, strict, LLM-friendly language for grid-based floor plans. Plans define a rectangular grid, rooms and terraces by grid-index ranges, wall thicknesses, compound spaces, wall-attached furniture, windows, doors, and openings. The compiler validates the plan, infers dimensions, areas, and adjoining-room door definitions, emits normalized JSON, and renders deterministic SVG.

[ArchLang](https://github.com/ChanMeng666/archlang) is a more advanced floor-plan language and compiler. PlanDL deliberately stays smaller; it is not trying to replace BIM.

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

## Syntax

Each nonempty line starts with an uppercase command followed by space-separated `KEY=value` parameters. Strings can be bare words or double-quoted text. Scalars and arrays use forms such as `400mm`, `1.8m`, `45sqm`, `[3m,2m,3m]`, and `[Wardrobe,Storage]`. Lines beginning with `#` are comments.

Lengths accept `mm`, `cm`, and `m`; unitless lengths are millimetres. Areas accept `sqm`. Grid indices are unitless integers.

## Example

```text
GRID STEPS_X=[3m,2m,3m] STEPS_Y=[1m,3m] INFER OUTER_DIMENSIONS=[8.7m,4.7m] OUTER_AREA=40.89sqm PERIMETER=26.8m
DEFAULT INNER_THICKNESS=100mm BEARING_THICKNESS=250mm OUTER_THICKNESS=400mm
ROOM NAME=Hall X=[0,1] Y=[1,2]
ROOM NAME=Bedroom X=[1,3] Y=[1,2] INFER INNER_DIMENSIONS=[4.9m,2.9m] AREA=14.21sqm
BED WALL=Bedroom_SOUTH OFFSET=1m PADDING=50mm WIDTH=1.8m
WINDOW WALL=Bedroom_EAST OFFSET=1m WIDTH=2m
DOOR WALL=Bedroom_WEST OFFSET=1m WIDTH=0.8m HINGE=LEFT OPENING=INWARD
```

Because the door is on an inner wall shared with `Hall`, the resolved model contains an inferred definition equivalent to:

```text
INFER DOOR WALL=Hall_EAST OFFSET=1m WIDTH=0.8m HINGE=RIGHT OPENING=OUTWARD
```

## Grid

A plan starts with one `GRID` definition:

```text
GRID STEPS_X=[1m,2m] STEPS_Y=[3m]
```

Steps are distances between adjacent grid lines. This example creates vertical lines at X=0, X=1m, and X=3m, and horizontal lines at Y=0 and Y=3m. The Y axis points north. Wall thickness does not change grid coordinates.

## Rooms, terraces, and compound spaces

```text
ROOM NAME=Bedroom X=[1,3] Y=[1,2]
TERRACE NAME=Patio X=[0,1] Y=[0,1]
```

`X` and `Y` are start and end grid-line indices. Rectangles must be nonempty, and room and terrace names are unique.

A room or terrace can merge other spaces of the same type:

```text
GRID STEPS_X=[2m,2m] STEPS_Y=[3m,0.6m]
ROOM NAME=Wardrobe X=[0,1] Y=[1,2]
ROOM NAME=Bedroom X=[0,2] Y=[0,1] MERGE=[Wardrobe]
```

Walls between members of a compound space are omitted. A space can have only one merge parent, and merge cycles are invalid.

## Wall thickness and bearing lines

```text
DEFAULT INNER_THICKNESS=100mm BEARING_THICKNESS=250mm OUTER_THICKNESS=400mm
BEARING X=[2,4]
BEARING Y=[1]
```

`DEFAULT` overrides any of the three thicknesses and may appear once. `BEARING` marks complete vertical or horizontal grid lines.

Inner and bearing walls are centered on grid lines. Outer walls put half the applicable inner or bearing thickness inside and the rest of the outer thickness outside. With the defaults, a non-bearing outer wall extends 50mm inside and 350mm outside; a bearing outer wall extends 125mm inside and 275mm outside. Terrace outer walls have zero thickness.

## Inference

`INFER` marks compiler-derived properties:

```text
GRID STEPS_X=[3m,2m,3m] STEPS_Y=[1m,3m] INFER OUTER_DIMENSIONS=[8.7m,4.7m] OUTER_AREA=40.89sqm PERIMETER=26.8m
ROOM NAME=Bedroom X=[1,3] Y=[1,2] INFER INNER_DIMENSIONS=[4.9m,2.9m] AREA=14.21sqm
```

Values after `INFER` are advisory in source; resolved JSON always contains recomputed values. Compound parents have aggregate area and no single inner-dimensions pair. Resolved JSON uses millimetres and square millimetres.

## Furniture

The furniture commands are `BED`, `DESK`, `CABINET`, `SINK`, `FRIDGE`, `OVEN`, `SOFA`, `TABLE`, `ISLAND`, `TOILET`, `SHOWER`, and `BATHTUB`:

```text
BED WALL=Bedroom_SOUTH OFFSET=1m PADDING=50mm WIDTH=1.8m
SOFA WALL=Living_NORTH OFFSET=500mm WIDTH=2.5m DEPTH=900mm
```

`WALL` combines a room name with `NORTH`, `SOUTH`, `EAST`, or `WEST`. `OFFSET` and `WIDTH` run along the inner wall face from its lowest X or Y coordinate. `PADDING` defaults to zero. `DEPTH` extends into the room and uses the furniture type's standard depth when omitted.

## Windows, doors, and openings

```text
WINDOW WALL=Bedroom_EAST OFFSET=1m WIDTH=2m
DOOR WALL=Bedroom_WEST OFFSET=1m WIDTH=0.8m HINGE=LEFT OPENING=INWARD
OPENING WALL=Living_WEST OFFSET=1m WIDTH=3m
```

Openings use the same wall coordinates as furniture. `HINGE` is `LEFT` or `RIGHT` as seen from inside the named room and defaults to `LEFT`. `OPENING` is `INWARD` or `OUTWARD` relative to that room and defaults to `INWARD`.

A door on an inner wall generates a mirrored definition for the adjoining room. The compass side, hinge, and swing are reversed, and the offset is recomputed from the adjoining room's inner wall face. Resolved JSON includes explicit and inferred openings with an `inferred` flag. Leading `INFER DOOR`, `INFER WINDOW`, and `INFER OPENING` definitions are also accepted for generated source.

## Repository layout

- `modules/parser` — line-oriented DSL parser.
- `modules/core` — defaults, grid and room resolver, inference, normalized model, and validation.
- `modules/renderer` — deterministic SVG renderer and furniture symbols.
- `modules/cli` — `check`, `compile`, `describe`, `defaults`, and `spec` commands.
- `modules/playground` — the live browser editor used on the documentation front page.
- `examples` — open-plan, compound-room, terrace, and larger residential examples.
- `docs` — Hugo/Hextra documentation site.
- `scripts` — example generation, site builds, preview, and AWS/Pages deployment.

## Documentation development

A Hugo Extended version compatible with current Hextra is required (0.146 or newer; the project uses 0.156.0).

```sh
npm run build
npm run site:build
npm run site:serve
```

`npm run site:generate` validates the examples and regenerates their SVGs plus the machine-readable defaults and compact specification used by the site.

## AWS deployment

The documentation is published at [https://d3eb034fkslao0.cloudfront.net/](https://d3eb034fkslao0.cloudfront.net/) from a private S3 bucket through CloudFront. With AWS credentials configured, rebuild, upload, and invalidate the distribution with:

```sh
npm run site:deploy:aws
```

## Project scope

Version 1 supports rectangular grids, rectangular and compound rooms, terraces, inner/bearing/outer walls, dimension and area inference, wall-attached furniture, windows, doors, openings, mirrored inner-door inference, normalized JSON, validation, and SVG. It does not currently target off-grid geometry, curved rooms, automatic layout, DXF/PDF, IFC, or full BIM semantics.
