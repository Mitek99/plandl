# PlanDL

PlanDL is a small, strict, LLM-friendly language for grid-based floor plans. Plans define a rectangular grid, typed rooms and terraces by grid-index ranges, doors that connect named rooms, wall-attached furniture and windows, and wall thicknesses. The compiler validates the geometry, then checks the plan as a home: every room reachable, nothing in the way of a door, windows and fixtures where the room type needs them. Every warning carries the numbers needed to fix it. It infers dimensions, areas, and access, can write those facts back into the source, emits normalized JSON, and renders deterministic SVG.

The language exists so that AI agents can produce coherent floor plans. The grid and wall-relative placement remove most geometric errors; the checker reports the relational ones a model cannot see.

[ArchLang](https://github.com/ChanMeng666/archlang) is a more advanced floor-plan language and compiler. PlanDL deliberately stays smaller; it is not trying to replace BIM.

## Quick start

PlanDL requires Node.js 26.13.0 or newer.

```sh
nvm use
npm install
npm run build
node modules/cli/dist/cli.js check examples/open-plan.plandl
node modules/cli/dist/cli.js infer examples/open-plan.plandl
node modules/cli/dist/cli.js compile examples/open-plan.plandl -o open-plan.svg --grid
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
GRID LINES_X=[1.6m,9m] LINES_Y=[4m]
ROOM NAME=Hall TYPE=CIRCULATION X=[0,1] Y=[0,1]
ROOM NAME=Bedroom TYPE=BEDROOM X=[1,2] Y=[0,1]
DOOR BETWEEN=[OUTSIDE,Hall] SIDE=SOUTH WIDTH=900mm AT=CENTER
DOOR BETWEEN=[Hall,Bedroom] WIDTH=800mm
WINDOW WALL=Bedroom_EAST OFFSET=1m WIDTH=1.8m
BED WALL=Bedroom_NORTH OFFSET=3m PADDING=50mm WIDTH=1.6m
```

`plandl check` reports `valid` with a room table. `plandl infer` rewrites it with the computed facts, for example:

```text
ROOM NAME=Bedroom TYPE=BEDROOM X=[1,2] Y=[0,1] INFER INNER_DIMENSIONS=[7.3m,3.9m] AREA=28.47sqm ACCESS=[Hall]
DOOR BETWEEN=[Hall,Bedroom] WIDTH=800mm INFER WALL=Bedroom_WEST OFFSET=100mm HINGE=LEFT OPENING=INWARD CONNECTS=[Bedroom,Hall] SWINGS_INTO=Bedroom
```

## Grid

A plan starts with one `GRID` definition:

```text
GRID LINES_X=[1m,+2m] LINES_Y=[3m]
```

There is always a grid line at 0, and `LINES_X`/`LINES_Y` list the lines after it. Each entry is absolute (`3m`), measured from the previous line (`+3m`), or measured back to the next line (`-3m`), and the forms can be mixed: `[3m,6m,9m,12m]`, `[+3m,+3m,+3m,+3m]`, and `[3m,+3m,-3m,12m]` all give lines at 0, 3, 6, 9, and 12m. This example creates vertical lines at X=0, X=1m, and X=3m, and horizontal lines at Y=0 and Y=3m. The Y axis points north. Wall thickness does not change grid coordinates.

## Rooms, terraces, and compound spaces

```text
ROOM NAME=Bedroom TYPE=BEDROOM X=[1,3] Y=[1,2]
TERRACE NAME=Patio X=[0,1] Y=[0,1]
```

`X` and `Y` are start and end grid-line indices. Rectangles must be nonempty, and room and terrace names are unique. The optional `TYPE` is one of `LIVING`, `KITCHEN`, `DINING`, `BEDROOM`, `BATHROOM`, `WC`, `CIRCULATION`, `STORAGE`, `UTILITY`, or `OFFICE`, and enables the room-type checks.

A room or terrace can merge other spaces of the same type:

```text
GRID LINES_X=[+2m,+2m] LINES_Y=[+3m,+0.6m]
ROOM NAME=Wardrobe X=[0,1] Y=[1,2]
ROOM NAME=Bedroom X=[0,2] Y=[0,1] MERGE=[Wardrobe]
```

Each member is its own non-overlapping rectangle; never draw the parent as a bounding box around its members. Walls between members of a compound space are omitted. A space can have only one merge parent, and merge cycles are invalid.

## Wall thickness and bearing lines

```text
DEFAULT INNER_THICKNESS=100mm BEARING_THICKNESS=250mm OUTER_THICKNESS=400mm
BEARING X=[2,4]
BEARING Y=[1]
```

`DEFAULT` overrides any of the three thicknesses and may appear once. `BEARING` marks complete vertical or horizontal grid lines.

Inner and bearing walls are centered on grid lines. Outer walls put half the applicable inner or bearing thickness inside and the rest of the outer thickness outside. With the defaults, a non-bearing outer wall extends 50mm inside and 350mm outside; a bearing outer wall extends 125mm inside and 275mm outside. Terrace outer walls have zero thickness.

## Inference

`INFER` marks compiler-derived facts: grid outer size, area and perimeter; room inner size, area and access; the wall, offset, hinge and swing chosen for `BETWEEN` doors, and what each door connects; standard furniture depths. `plandl infer` writes them into the source. Values you write after `INFER` are checked against the computed ones, and a difference is reported as `INFER_MISMATCH`. Resolved JSON always contains recomputed values, in millimetres and square millimetres.

## Checks

`plandl check` rejects plans with errors, and reports warnings on valid plans: rooms without access, rooms entered through a bathroom or kitchen, doors swinging into corridors or into each other, furniture overlapping or blocking a door swing, windows in inner walls or missing from habitable rooms, missing fixtures, undersized rooms, a high share of circulation, and `INFER` values that do not match. It then prints a room table with areas and access. `--strict` makes warnings fail the command.

## Furniture

The furniture commands are `BED`, `DESK`, `CABINET`, `SINK`, `FRIDGE`, `OVEN`, `SOFA`, `TABLE`, `ISLAND`, `TOILET`, `SHOWER`, `BATHTUB`, `WARDROBE`, `WASHER`, and `DISHWASHER`:

```text
BED WALL=Bedroom_SOUTH OFFSET=1m PADDING=50mm WIDTH=1.8m
SOFA WALL=Living_NORTH OFFSET=500mm WIDTH=2.5m DEPTH=900mm
```

`WALL` combines a room name with `NORTH`, `SOUTH`, `EAST`, or `WEST`. `OFFSET` and `WIDTH` run along the inner wall face from its lowest X or Y coordinate. `PADDING` defaults to zero. `DEPTH` extends into the room and uses the furniture type's standard depth when omitted.

## Windows, doors, and openings

Doors and openings usually name the two spaces they connect, and the compiler finds the shared wall:

```text
DOOR BETWEEN=[OUTSIDE,Hall] SIDE=SOUTH WIDTH=900mm
DOOR BETWEEN=[Hall,Bedroom] WIDTH=800mm AT=END
OPENING BETWEEN=[Kitchen,Dining] WIDTH=1.2m AT=CENTER
```

The door is placed near the start (default), centre, or end of the shared stretch, hinged on the corner side, and swings into the second space. `OUTSIDE` names the exterior, and `SIDE` picks a side of the second space when they share several walls. Doors and openings can also be placed on a named wall, which is the only form for windows:

```text
WINDOW WALL=Bedroom_EAST OFFSET=1m WIDTH=2m
DOOR WALL=Bedroom_WEST OFFSET=1m WIDTH=0.8m HINGE=LEFT OPENING=INWARD
OPENING WALL=Living_WEST OFFSET=1m WIDTH=3m
```

Openings use the same wall coordinates as furniture. `HINGE` is `LEFT` or `RIGHT` as seen from inside the named room and defaults to `LEFT`. `OPENING` is `INWARD` or `OUTWARD` relative to that room and defaults to `INWARD`.

A door on an inner wall generates a mirrored definition for the adjoining room. The compass side, hinge, and swing are reversed, and the offset is recomputed from the adjoining room's inner wall face. Resolved JSON includes explicit and inferred openings with an `inferred` flag. Leading `INFER DOOR`, `INFER WINDOW`, and `INFER OPENING` definitions are also accepted for generated source.

## Repository layout

- `modules/parser` — line-oriented DSL parser.
- `modules/core` — defaults, grid and room resolver, inference, normalized model, validation, and the relational checks.
- `modules/renderer` — deterministic SVG renderer and furniture symbols.
- `modules/cli` — `check`, `infer`, `compile`, `describe`, `defaults`, and `spec` commands.
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

The documentation is published at [https://plandl.org/](https://plandl.org/) from a private S3 bucket through CloudFront. The deploy runs as the `app-deployer` IAM user (the `app-deployer` profile in `~/.aws/credentials`; override with `PLANDL_AWS_PROFILE`). Rebuild, upload, and invalidate the distribution with:

```sh
npm run site:deploy:aws
```

## Project scope

PlanDL 0.4 supports rectangular grids, typed rectangular and compound rooms, terraces, inner/bearing/outer walls, dimension, area and access inference, doors between named rooms, wall-attached furniture, windows, doors, openings, mirrored inner-door inference, relational checks, normalized JSON, and SVG. It does not currently target off-grid geometry, curved rooms, automatic layout, DXF/PDF, IFC, or full BIM semantics.
