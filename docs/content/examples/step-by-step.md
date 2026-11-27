---
title: Step by step
weight: 1
---

This page builds one small house in seven steps. It starts with a single room and its exterior walls, then adds openings, a second room and furniture. Each step is a complete plan of its own. The documentation build validates and renders every step, so the build fails if any step stops checking.

The sources are in the repository at `examples/step-by-step/`. You can check any step yourself:

```sh
node modules/cli/dist/cli.js check examples/step-by-step/03-windows.plandl
```

## 1. One room

{{< plandl-step name="01-shell" alt="A single rectangular room enclosed by four exterior walls" >}}

`GRID` lays down the grid lines. `STEPS_X=[9m]` gives vertical lines at 0 and 9 m, and `STEPS_Y=[6m]` gives horizontal lines at 0 and 6 m. The Y axis points north.

`ROOM` selects a rectangle by grid-line index, not by length: `X=[0,1] Y=[0,1]` is the whole 9 × 6 m grid. You don't write the walls yourself. The compiler puts an exterior wall on each side that has no neighbouring room. A default exterior wall is 400 mm thick: 50 mm inside the grid line and 350 mm outside. That leaves an 8.9 × 5.9 m interior.

## 2. A front door

{{< plandl-step name="02-front-door" alt="The room with a hinged front door in the south wall" >}}

Openings and furniture name a wall as `Room_SIDE`. `OFFSET` runs along the inner face of that wall from its lowest X or Y coordinate, so on a south wall it counts from the west corner. `HINGE` is seen from inside the room, and `OPENING=INWARD` swings the door into it.

## 3. Windows

{{< plandl-step name="03-windows" alt="The room with windows on the north, west and south walls" >}}

Windows use the same coordinates as doors. On the west wall the lowest coordinate is Y, so `OFFSET=2000mm` counts north from the south-west corner. Every opening must fit on its wall, which the validator checks.

## 4. A second room

{{< plandl-step name="04-partition" alt="An internal wall on a new grid line splits the house into Living and Bedroom" >}}

The grid gets a second X step, which adds a grid line at 5.5 m. `Living` keeps `X=[0,1]`, so every opening that refers to `Living_…` still fits and nothing else in the source changes. `Bedroom` takes `X=[1,2]`.

The compiler puts a 100 mm internal wall on the shared grid line, centred on it.

## 5. Bedroom door and windows

{{< plandl-step name="05-bedroom-openings" alt="A door in the internal wall and two bedroom windows" >}}

The bedroom door sits in the internal wall, so you only write it once from the bedroom side. The compiler adds the matching door for `Living_EAST`, with the hinge and swing mirrored. It appears in `describe` output with `inferred: true`.

## 6. Living room furniture

{{< plandl-step name="06-living-furniture" alt="A sofa, a kitchen run and a dining table in the living room" >}}

Each furniture line starts with its type. `WIDTH` runs along the wall, `PADDING` is the gap from the wall face, and `DEPTH` runs into the room. Without `DEPTH`, the type's standard depth is used, as with the sofa. The dining table has `PADDING=1200mm`, so it stands in the room, away from the north wall. Furniture must fit on its wall and inside its room.

## 7. Bedroom furniture

{{< plandl-step name="07-bedroom-furniture" alt="A bed against the internal wall and a wardrobe on the east wall" >}}

A bed's headboard sits on the padding line, so this bed stands against the internal wall. A `CABINET` 600 mm deep on the east wall works as a wardrobe. That completes the plan.
