---
title: Compound rooms
---

![Bedroom with a merged wardrobe](../auto-extend.svg)

`Bedroom` merges `Wardrobe`, so the shared wall is omitted and the parent's inferred area includes both components. The furniture remains attached to a named component or compound wall.

```text
GRID STEPS_X=[2m,2m] STEPS_Y=[3m,0.6m]
ROOM NAME=Wardrobe X=[0,1] Y=[1,2] INFER INNER_DIMENSIONS=[1.9m,0.55m] AREA=1.045sqm
ROOM NAME=Bedroom X=[0,2] Y=[0,1] MERGE=[Wardrobe] INFER AREA=12.4525sqm
BED WALL=Bedroom_SOUTH OFFSET=1m PADDING=50mm WIDTH=1.8m
CABINET WALL=Wardrobe_NORTH OFFSET=100mm WIDTH=1.5m DEPTH=500mm
```
