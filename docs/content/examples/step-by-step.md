---
title: Step by step
weight: 1
aliases:
  - /step-by-step/
---

This page builds one small house in seven steps, the way an author (or an agent) would: add something, run `plandl check`, read what it reports, and fix that next. Each step is a complete plan. Under each drawing is the real output of `plandl check` for that step. The documentation build runs every step through the compiler, so the page cannot drift from what the tools say.

The sources are in the repository at `examples/step-by-step/`. You can check any step yourself:

```sh
node modules/cli/dist/cli.js check examples/step-by-step/04-partition.plandl
```

## 1. One room

{{< plandl-step name="01-shell" alt="A single rectangular room enclosed by four exterior walls" >}}

`GRID` lays down the grid lines. There is always a line at 0, so `LINES_X=[9m]` gives vertical lines at 0 and 9 m, and `LINES_Y=[6m]` gives horizontal lines at 0 and 6 m. The Y axis points north.

`ROOM` selects a rectangle by grid-line index, not by length: `X=[0,1] Y=[0,1]` is the whole 9 × 6 m grid. You don't write the walls yourself; the compiler puts an exterior wall on each side that has no neighbouring room. A default exterior wall is 400 mm thick, 50 mm inside the grid line and 350 mm outside, which leaves an 8.9 × 5.9 m interior.

`TYPE=LIVING` tells the checker what the room is for. The plan is valid, but `check` already has two things to say: nobody can get in, and a living room needs daylight.

## 2. A front door

{{< plandl-step name="02-front-door" alt="The room with a hinged front door in the south wall" >}}

`DOOR BETWEEN=[OUTSIDE,Living]` names the two spaces the door connects, and the compiler finds the wall between them. `OUTSIDE` borders the room on all four sides, so `SIDE=SOUTH` picks the south wall. The door goes 100 mm from the corner at the start of that wall, is hinged on the corner side, and swings into the second space, the living room. The entrance warning is gone.

## 3. Windows

{{< plandl-step name="03-windows" alt="The room with windows on the north, west and south walls" >}}

Windows are placed on a named wall: `Living_NORTH` is the north side of `Living`. `OFFSET` runs along the inner face of the wall from its lowest X or Y end, the inside corner, so on the north wall it counts from the west corner and on the west wall from the south corner. With a window in an outer wall, the room passes every check.

## 4. A second room

{{< plandl-step name="04-partition" alt="An internal wall on a new grid line splits the house into Living and Bedroom" >}}

`LINES_X=[5.5m,9m]` adds a vertical grid line at 5.5 m and keeps the outer line at 9 m. `Living` keeps `X=[0,1]`, so everything that refers to `Living_…` still fits. `Bedroom` takes `X=[1,2]`, and the compiler puts a 100 mm internal wall on the shared grid line.

Because the bedroom has `TYPE=BEDROOM`, `check` lists what it is missing: a door, a window, and a bed. The next steps fix them in that order.

## 5. Bedroom door and windows

{{< plandl-step name="05-bedroom-openings" alt="A door in the internal wall and two bedroom windows" >}}

`DOOR BETWEEN=[Living,Bedroom]` finds the wall the two rooms share. `AT=END` puts the door near the north end of that wall, and because the bedroom is listed second, the door swings into the bedroom. The compiler also records the door for the living-room side, so it is written only once. Only the bed is still missing.

## 6. Living room furniture

{{< plandl-step name="06-living-furniture" alt="A sofa, a kitchen run and a dining table in the living room" >}}

Each furniture line starts with its type. `WIDTH` runs along the wall, `PADDING` is the gap from the wall face, and `DEPTH` runs into the room. Without `DEPTH`, the type's standard depth is used. The dining table has `PADDING=1200mm`, so it stands in the room, away from the north wall. `check` would report any piece that overlapped another or stood in a door's swing; here everything is clear, and only the bedroom's bed is still missing.

## 7. Bedroom furniture

{{< plandl-step name="07-bedroom-furniture" alt="A bed against the internal wall and a wardrobe on the east wall" >}}

The bed's headboard sits on the padding line, so this bed stands against the internal wall, clear of the door at the other end of it. The `WARDROBE` stands on the east wall. `check` now reports no warnings: the house can be entered, every room can be reached, each has daylight, and nothing blocks a door.

Run `plandl infer` on the last step to see the computed facts written into the source: each room's inner size, area, and the spaces it opens onto, and the wall and offset the compiler chose for each `BETWEEN` door.
