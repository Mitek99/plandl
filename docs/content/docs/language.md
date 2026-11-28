---
title: Language
seoTitle: "Language reference: grid, rooms, doors, windows"
description: "PlanDL language reference: lexical rules and the GRID, ROOM, TERRACE, MERGE, DOOR, OPENING, WINDOW, and furniture commands, with parameters and examples."
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
ROOM NAME=Bedroom TYPE=BEDROOM X=[1,3] Y=[1,2]
TERRACE NAME=Patio X=[0,1] Y=[0,1]
```

`X` and `Y` contain start and end grid-line indices. The selected rectangle must be nonempty, and every wall lies on a grid line. Names are unique across rooms and terraces. The Y axis points north.

### Room types

`TYPE` is optional on `ROOM`: `LIVING`, `KITCHEN`, `DINING`, `BEDROOM`, `BATHROOM`, `WC`, `CIRCULATION`, `STORAGE`, `UTILITY`, or `OFFICE`. A type tells `plandl check` what the room is for, so it can report problems such as a bedroom without a window or bed, a kitchen without a cooker, a bedroom entered through the kitchen, or a hall that takes too much of the floor. Untyped rooms get only the geometric checks. The rules for each type are listed in [Checks](../checks/).

### Compound rooms

```text
GRID LINES_X=[+2m,+2m] LINES_Y=[+3m,+0.6m]
ROOM NAME=Wardrobe X=[0,1] Y=[1,2]
ROOM NAME=Bedroom X=[0,2] Y=[0,1] MERGE=[Wardrobe]
```

A compound room combines rectangles into a more complex space. Each member is its own non-overlapping rectangle, and the parent lists its members in `MERGE`; never draw the parent as a bounding box around them, which is `ROOM_OVERLAP`. Walls between members of the compound are omitted. A member keeps its own name for its walls and can have its own `TYPE`, such as an open kitchen merged into a living room. Rooms can merge only rooms, and terraces only terraces. A space cannot have more than one merge parent, and merge cycles are invalid.

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
ROOM NAME=Bedroom TYPE=BEDROOM X=[1,3] Y=[1,2] INFER INNER_DIMENSIONS=[4.9m,2.9m] AREA=14.21sqm ACCESS=[Hall]
DOOR BETWEEN=[Hall,Bedroom] WIDTH=800mm INFER WALL=Bedroom_WEST OFFSET=100mm HINGE=LEFT OPENING=INWARD CONNECTS=[Bedroom,Hall] SWINGS_INTO=Bedroom
BED WALL=Bedroom_SOUTH OFFSET=1m WIDTH=1.6m INFER DEPTH=2000mm
```

Everything after `INFER` describes facts the compiler computes. You never have to write them: `plandl infer` rewrites the source with the current values, so the facts sit next to the line they describe. Normalized output always uses recomputed values.

The facts are:

| Line | Facts after `INFER` |
|---|---|
| `GRID` | `OUTER_DIMENSIONS`, `OUTER_AREA`, `PERIMETER` |
| `ROOM`, `TERRACE` | `INNER_DIMENSIONS`, `AREA`, `ACCESS` (the spaces its doors and openings lead to) |
| `DOOR`, `OPENING` | `CONNECTS`, `SWINGS_INTO`, and for `BETWEEN` also `WALL`, `OFFSET`, `HINGE`, `OPENING` |
| furniture | `DEPTH`, when the standard depth is used |

If you write a value after `INFER` yourself, `plandl check` compares it with the computed one and reports `INFER_MISMATCH` when they differ. Writing an expectation such as `INFER AREA=12sqm` on a bedroom is a cheap way to find out whether the plan is what you think it is. Resolved JSON uses millimetres and square millimetres.

## Windows, doors, and openings

### Between two spaces

```text
DOOR BETWEEN=[OUTSIDE,Hall] SIDE=SOUTH WIDTH=900mm
DOOR BETWEEN=[Hall,Bedroom] WIDTH=800mm AT=END
OPENING BETWEEN=[Kitchen,Dining] WIDTH=1.2m AT=CENTER
```

The usual way to write a door is to name the two spaces it connects. The compiler finds the wall they share and places the door there. `AT=START` (the default) puts it 100 mm from the corner at the low X or Y end of the shared stretch, `AT=END` at the other end, and `AT=CENTER` in the middle. A door is hinged on the corner side and swings into the second space, so listing the hall first makes doors open into the rooms. `OUTSIDE` names the exterior; `DOOR BETWEEN=[OUTSIDE,Hall]` is an entrance into the hall.

When the spaces share more than one wall, which is always the case with `OUTSIDE`, `SIDE` picks the side of the second space to use. Without it, the longest shared stretch is used. `HINGE` and `OPENING` can still override the defaults. If the spaces share no wall, or not enough of it for the width, `check` rejects the plan and lists what the room does border.

`plandl infer` writes the chosen `WALL`, `OFFSET`, `HINGE`, and `OPENING` after `INFER` on the same line.

### On a named wall

```text
WINDOW WALL=Bedroom_EAST OFFSET=1m WIDTH=2m
DOOR WALL=Bedroom_WEST OFFSET=3m WIDTH=0.8m HINGE=LEFT OPENING=INWARD
OPENING WALL=Living_WEST OFFSET=1m WIDTH=3m
```

Windows are always written this way, and doors and openings can be when the exact position matters. All three use the same wall and offset coordinates as furniture. `HINGE` is `LEFT` or `RIGHT` as seen from inside the named room and defaults to `LEFT`. `OPENING` is `INWARD` or `OUTWARD` relative to that room and defaults to `INWARD`.

A door on an inner wall generates a mirrored definition for the adjoining room. Its compass side, hinge, and swing are reversed, and its offset is recomputed from the adjoining room's inner wall face:

```text
DOOR WALL=Bedroom_WEST OFFSET=1m WIDTH=0.8m HINGE=LEFT OPENING=INWARD
INFER DOOR WALL=Hall_EAST OFFSET=1m WIDTH=0.8m HINGE=RIGHT OPENING=OUTWARD
```

Resolved JSON includes both definitions. The generated one has `inferred: true` and identifies `inferredFrom`. Declare each door once, from either side, never from both. Leading `INFER` is accepted for complete opening definitions so generated source can be read without recursively creating another counterpart.

Windows belong in outer walls, the walls to the outside or to a terrace. Doors and openings are what connect rooms: every room needs one, and the plan needs a door to `OUTSIDE`.

## Furniture

The furniture commands are `BED`, `DESK`, `CABINET`, `SINK`, `FRIDGE`, `OVEN`, `SOFA`, `TABLE`, `ISLAND`, `TOILET`, `SHOWER`, `BATHTUB`, `WARDROBE`, `WASHER`, and `DISHWASHER`. Their standard depths and typical widths are listed in the [specification](../../spec.txt) and on the [Defaults](../defaults/) page.

```text
BED WALL=Bedroom_SOUTH OFFSET=1m PADDING=50mm WIDTH=1.8m
```

`WALL` combines a room name with `NORTH`, `SOUTH`, `EAST`, or `WEST`. `OFFSET` runs along the inner wall face from its lowest X or Y coordinate. `PADDING` is the gap from that face and defaults to zero. `WIDTH` runs along the wall; optional `DEPTH` extends into the room and otherwise uses the furniture type's standard depth.

Furniture must fit on one wall segment and within the room perpendicular to the wall. `OFFSET` starts at the inside corner, not at the grid line: a room between grid lines X=0 and X=4m has inner faces at 50 mm and 3950 mm, so its north and south walls are 3.9 m long. Items on perpendicular walls meet in the corner, and a door of width W sweeps a quarter circle of radius W, so keep furniture clear of both; `plandl check` reports overlaps and furniture in door swings.
