---
title: Checks
weight: 5
---

`plandl check` reports two kinds of problems. **Errors** reject the plan: it cannot be resolved or drawn. **Warnings** leave the plan valid but mark what an architect would redline: a room nobody can enter, a wardrobe in the way of a door, a bedroom without a window. Every message names the lines involved and gives numbers (offsets, widths, areas) so it can be fixed in one edit.

```text
$ plandl check house.plandl
house.plandl: valid, 13 warnings
house.plandl:4:1: warning UNREACHABLE_ROOM Bedroom2 (BEDROOM) has no door or opening. It borders: Bedroom (BEDROOM) W, outside E/S/N.
house.plandl:6:1: warning WINDOW_IN_INNER_WALL The window on Kitchen_EAST is in the inner wall shared with Bedroom. Windows belong in outer walls.
house.plandl:2:1: warning NO_WINDOW Kitchen (KITCHEN) has no window. It has outer walls on side W, S, N; add for example WINDOW WALL=Kitchen_WEST OFFSET=500mm WIDTH=1200mm.
...
ROOM      TYPE     INNER SIZE   AREA      ACCESS   WINDOWS
Kitchen   KITCHEN  3.9 x 3.9 m  15.21 m²  OUTSIDE  1
Bedroom   BEDROOM  2.9 x 3.9 m  11.31 m²  OUTSIDE  0
Bedroom2  BEDROOM  1.2 x 3.9 m  4.68 m²   none     0
Net area 31.2 m².
```

This is a deliberately broken 13-line plan with a defect on almost every line. After the warnings, `check` prints a table of every room with its type, inner size, area, the spaces it opens onto, and its window count, followed by the net area and the share taken by circulation. `--quiet` leaves the table out, `--json` returns everything as data, and `--strict` makes warnings fail the command, which suits automated pipelines and agents.

## Errors

Errors cover syntax, unknown names and walls, the grid (unresolvable or non-increasing lines), overlapping spaces, rooms with no interior once walls are applied, invalid merges, furniture and openings that do not fit their wall or room, and `BETWEEN` spaces that share no wall or too little of it. See [Geometry and validation](../geometry/#validation).

## Warnings

| Code | Reported when |
|---|---|
| `NO_ENTRANCE` | No door or opening leads outside. |
| `UNREACHABLE_ROOM` | A room has no door or opening, or its doors lead only to rooms that cannot be reached from an entrance. The message lists what the room borders. |
| `ACCESS_THROUGH_ROOM` | A typed room is entered only through a bathroom, WC, storage room, or (for bedrooms) a kitchen or another bedroom. |
| `WET_ROOM_OFF_KITCHEN` | A bathroom or WC opens directly off a kitchen. |
| `DOOR_INTO_CORRIDOR` | A door swings into a `CIRCULATION` room instead of into the room it serves. WCs and storage rooms are exempt. |
| `NO_WINDOW` | A `LIVING`, `KITCHEN`, `DINING`, `BEDROOM`, or `OFFICE` room has no window in an outer wall. |
| `WINDOW_IN_INNER_WALL` | A window sits in a wall between two rooms. |
| `MISSING_FIXTURE` | A typed room lacks its fixtures (see below). |
| `MISPLACED_FIXTURE` | A toilet, shower, or bathtub stands in a dry room, or a bed in a kitchen, bathroom, WC, or hall. |
| `ROOM_TOO_SMALL` | A typed room is below its minimum area or width. |
| `CIRCULATION_SHARE` | `CIRCULATION` rooms take more than 20% of the net area. Typical homes use 10–15%. |
| `FURNITURE_OVERLAP` | Two pieces of furniture overlap, most often in a corner between perpendicular walls. |
| `FURNITURE_IN_DOOR_SWING` | Furniture stands in the quarter circle a door leaf sweeps. |
| `DOOR_SWINGS_COLLIDE` | Two door leaves sweep the same floor. |
| `OPENINGS_OVERLAP` | Two openings overlap on the same wall. |
| `OPENING_SPANS_ROOMS` | A door or opening spans the walls of two different rooms. |
| `ENCLOSED_EMPTY_CELL` | A grid cell surrounded by rooms belongs to no room. |
| `INFER_MISMATCH` | A value written after `INFER` differs from the computed one. |

Overlaps smaller than 0.01 m² are treated as touching and not reported.

## Room type rules

| Type | Window | Fixtures | Minimum |
|---|---|---|---|
| `LIVING` | required | | 10 m², 2.8 m wide |
| `KITCHEN` | required | `SINK`, `OVEN`, `FRIDGE` | 4 m², 1.5 m wide |
| `DINING` | required | | 5 m², 2.0 m wide |
| `BEDROOM` | required | `BED` | 6.5 m², 2.1 m wide |
| `BATHROOM` | | `SINK` and `SHOWER` or `BATHTUB` | 2.5 m², 1.4 m wide |
| `WC` | | `TOILET` | 0.9 m², 0.8 m wide |
| `CIRCULATION` | | | 0.9 m wide; counts toward the circulation share |
| `STORAGE` | | | |
| `UTILITY` | | | 1.5 m², 1.0 m wide |
| `OFFICE` | required | | 4 m², 1.8 m wide |

Fixtures count when their footprint's centre lies in the room, so an open kitchen merged into a living room is checked on its own. These are deliberately modest defaults for catching mistakes, not a building code.
