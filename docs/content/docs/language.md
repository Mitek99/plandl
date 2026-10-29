---
title: Language
weight: 3
---

## Lexical rules

Each nonempty line is one definition. Lines whose first non-whitespace character is `#` are comments. Reserved words are uppercase, IDs use lowercase letters, digits, and underscores, and names are double-quoted.

Lengths accept `mm`, `cm`, and `m` suffixes. Unitless numeric values are millimetres. Directions are degrees clockwise from up: `0` up, `90` right, `180` down, and `270` left.

## Variables

```text
LET living_width = 5000mm
LET kitchen_width = living_width * 0.6
LET total_width = living_width + kitchen_width
```

Expressions support `+`, `-`, `*`, `/`, parentheses, and earlier variable references. Forward references and division by zero are errors. The `default_` prefix is reserved for fixed built-in variables.

## Walls

```text
WALL EXTERNAL external_south "South exterior" DIRECTION 90 LENGTH total_width
WALL EXTERNAL external_east "East exterior" START external_south.end DIRECTION 0 LENGTH plan_depth
WALL INTERNAL divider "Divider" START external_south.at(4000mm) DIRECTION 0 LENGTH plan_depth
WALL VIRTUAL open_divider "Open boundary" START external_south.at(living_width) DIRECTION 0 LENGTH plan_depth
WALL TERRACE terrace_edge "Terrace guardrail" START terrace_south.end DIRECTION 0 LENGTH terrace_depth
```

The first wall has no `START` and begins at an implicit origin. Every later wall requires one of:

```text
START wall_id.start
START wall_id.end
START wall_id.at(offset)
```

Wall types:

- `EXTERNAL` — exterior walls; defaults to external thickness and standard wall height.
- `INTERNAL` — partitions; defaults to internal thickness and standard wall height.
- `VIRTUAL` — zero-thickness, zero-height, fully open logical room boundaries.
- `TERRACE` — terrace guardrails, rendered as rails with posts and using guardrail defaults.

Optional `THICKNESS` and `HEIGHT` expressions override type defaults. Absolute coordinates are not part of the language.

## Rooms

```text
ROOM living_room "Living room" WALLS [external_south, open_divider, external_north, external_west]
```

A room references an unordered set of wall IDs. The walls contain its boundary, but a room may use only a subsegment of a wall at a T-junction. The references must select exactly one closed, non-self-intersecting boundary.

## Attached definitions

```text
DOOR EXTERNAL front_door "Front door" OFFSET 800mm SIDE LEFT OPENING_TYPE HINGED
WINDOW living_window "Living room window" OFFSET 1000mm WIDTH 1800mm SIDE LEFT
OPENING passage "Passage" OFFSET 200mm WIDTH 900mm SIDE LEFT OPENING_TYPE CASED
OBJECT sofa "Sofa" KIND SOFA OFFSET 1200mm SIDE LEFT GAP 100mm SIZE 2500mm X 900mm
```

`ON wall_id` can explicitly select a host. Without `ON`, the closest preceding `WALL` is used. Doors require `INTERNAL` or `EXTERNAL` immediately after `DOOR`; their default width depends on that type.
