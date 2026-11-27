---
title: Language
weight: 3
---

## Lexical rules

Each nonempty line contains one command followed by space-separated parameters. Parameters are `KEY=value` pairs or the `INFER` modifier. Lines whose first non-whitespace character is `#` are comments.

Values can be strings, scalars, or arrays. Strings can be bare words such as `Bedroom` or double-quoted text such as `"Main bedroom"`. Arrays use commas:

```text
GRID LINES_X=[3m,+2m,8m] LINES_Y=[1m,4m]
```

Lengths accept `mm`, `cm`, and `m` suffixes; unitless lengths are millimetres. Areas use `sqm`. Grid indices are unitless integers.

## Grid

A plan starts with one `GRID` definition. There is always a grid line at 0. `LINES_X` and `LINES_Y` list the lines after it, and each entry can be written three ways:

- `3m` is an absolute line at 3 m.
- `+3m` is 3 m after the previous line. The first entry's previous line is 0.
- `-3m` is 3 m before the next line.

You can mix the three forms in one list. These three lists produce the same lines, at 0, 3, 6, 9 and 12 m:

```text
GRID LINES_X=[3m,6m,9m,12m] LINES_Y=[4m]
GRID LINES_X=[+3m,+3m,+3m,+3m] LINES_Y=[4m]
GRID LINES_X=[3m,+3m,-3m,12m] LINES_Y=[4m]
```

Use absolute lines for known overall dimensions, `+` for room widths measured from one side, and `-` for room widths measured back from a fixed line. For example, `[2.5m,+1.8m,-3.875m,11.875m]` fixes the envelope at 11.875 m and makes the last bay 3.875 m wide.

A `-` entry needs a next line that is absolute or another `-` entry. A trailing `-` entry, or a `-` entry followed by a `+` entry, is an error because neither line can be placed. Lines must strictly increase, so 0 itself is never listed. Wall thickness does not change grid coordinates.

`STEPS_X` and `STEPS_Y` from PlanDL 0.2 were replaced by `LINES_X` and `LINES_Y`. A 0.2 step list converts by putting `+` before each step.

## Rooms and terraces

```text
ROOM NAME=Bedroom X=[1,3] Y=[1,2]
TERRACE NAME=Patio X=[0,1] Y=[0,1]
```

`X` and `Y` contain start and end grid-line indices. The selected rectangle must be nonempty, and every wall lies on a grid line. Names are unique across rooms and terraces. The Y axis points north.

### Compound rooms

```text
GRID LINES_X=[+2m,+2m] LINES_Y=[+3m,+0.6m]
ROOM NAME=Wardrobe X=[0,1] Y=[1,2]
ROOM NAME=Bedroom X=[0,2] Y=[0,1] MERGE=[Wardrobe]
```

A compound room combines rectangles into a more complex space. Walls between members of the compound are omitted. Rooms can merge only rooms, and terraces only terraces. A space cannot have more than one merge parent, and merge cycles are invalid. Distinct spaces cannot overlap.

## Wall defaults and bearing lines

```text
DEFAULT INNER_THICKNESS=100mm BEARING_THICKNESS=250mm OUTER_THICKNESS=400mm
BEARING X=[2,4]
BEARING Y=[1]
```

`DEFAULT` can override any of the three thicknesses and may appear once. `BEARING` marks complete vertical or horizontal grid lines; every wall on a marked line uses bearing thickness where applicable.

## Inference

```text
GRID LINES_X=[+3m,+2m,+3m] LINES_Y=[+1m,+3m] INFER OUTER_DIMENSIONS=[8.7m,4.7m] OUTER_AREA=40.89sqm PERIMETER=26.8m
ROOM NAME=Bedroom X=[1,3] Y=[1,2] INFER INNER_DIMENSIONS=[4.9m,2.9m] AREA=14.21sqm
```

Everything after `INFER` is compiler-derived. Source values are advisory; the resolver recomputes normalized values rather than trusting them. Resolved JSON uses millimetres and square millimetres.

## Windows, doors, and openings

```text
WINDOW WALL=Bedroom_EAST OFFSET=1m WIDTH=2m
DOOR WALL=Bedroom_WEST OFFSET=3m WIDTH=0.8m HINGE=LEFT OPENING=INWARD
OPENING WALL=Living_WEST OFFSET=1m WIDTH=3m
```

All three use the same wall and offset coordinates as furniture. `HINGE` is `LEFT` or `RIGHT` as seen from inside the named room and defaults to `LEFT`. `OPENING` is `INWARD` or `OUTWARD` relative to that room and defaults to `INWARD`.

A door on an inner wall generates a mirrored definition for the adjoining room. Its compass side, hinge, and swing are reversed, and its offset is recomputed from the adjoining room's inner wall face:

```text
DOOR WALL=Bedroom_WEST OFFSET=1m WIDTH=0.8m HINGE=LEFT OPENING=INWARD
INFER DOOR WALL=Hall_EAST OFFSET=1m WIDTH=0.8m HINGE=RIGHT OPENING=OUTWARD
```

Resolved JSON includes both definitions. The generated one has `inferred: true` and identifies `inferredFrom`. Leading `INFER` is accepted for complete opening definitions so generated source can be read without recursively creating another counterpart.

## Furniture

The furniture commands are `BED`, `DESK`, `CABINET`, `SINK`, `FRIDGE`, `OVEN`, `SOFA`, `TABLE`, `ISLAND`, `TOILET`, `SHOWER`, and `BATHTUB`.

```text
BED WALL=Bedroom_SOUTH OFFSET=1m PADDING=50mm WIDTH=1.8m
```

`WALL` combines a room name with `NORTH`, `SOUTH`, `EAST`, or `WEST`. `OFFSET` runs along the inner wall face from its lowest X or Y coordinate. `PADDING` is the gap from that face and defaults to zero. `WIDTH` runs along the wall; optional `DEPTH` extends into the room and otherwise uses the furniture type's standard depth.

Furniture must fit on one wall segment and within the room perpendicular to the wall.
