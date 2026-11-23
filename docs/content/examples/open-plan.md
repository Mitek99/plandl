---
title: Open plan
---

![Open living room and kitchen](../open-plan.svg)

Two rooms share an inner wall on a two-column grid. Furniture and a window attach to named compass walls, while the living-room door generates an inferred kitchen-side definition. `INFER` records dimensions and areas recomputed by the compiler.

```text
GRID STEPS_X=[5m,3m] STEPS_Y=[5m] INFER OUTER_DIMENSIONS=[8.7m,5.7m] OUTER_AREA=49.59sqm PERIMETER=28.8m
ROOM NAME=Living X=[0,1] Y=[0,1] INFER INNER_DIMENSIONS=[4.9m,4.9m] AREA=24.01sqm
ROOM NAME=Kitchen X=[1,2] Y=[0,1] INFER INNER_DIMENSIONS=[2.9m,4.9m] AREA=14.21sqm
SOFA WALL=Living_SOUTH OFFSET=1200mm PADDING=100mm WIDTH=2500mm
TABLE WALL=Living_NORTH OFFSET=500mm PADDING=1200mm WIDTH=1800mm DEPTH=1000mm
WINDOW WALL=Living_NORTH OFFSET=3000mm WIDTH=1500mm
DOOR WALL=Living_EAST OFFSET=1000mm WIDTH=800mm HINGE=LEFT OPENING=INWARD
CABINET WALL=Kitchen_NORTH OFFSET=500mm WIDTH=2000mm DEPTH=650mm
FRIDGE WALL=Kitchen_EAST OFFSET=500mm PADDING=50mm WIDTH=800mm
```
