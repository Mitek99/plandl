---
title: Terrace
---

![Terrace with furniture](../terrace.svg)

`TERRACE` uses the same grid-index geometry as `ROOM`, but its outer walls have zero thickness. Its inferred inner dimensions are therefore the full grid span.

```text
GRID STEPS_X=[6m] STEPS_Y=[4m]
TERRACE NAME=Patio X=[0,1] Y=[0,1] INFER INNER_DIMENSIONS=[6m,4m] AREA=24sqm
TABLE WALL=Patio_SOUTH OFFSET=1500mm PADDING=500mm WIDTH=1800mm DEPTH=1000mm
CABINET WALL=Patio_WEST OFFSET=1000mm PADDING=200mm WIDTH=1200mm DEPTH=600mm
```
