---
title: Terrace
aliases:
  - /terrace/
---

{{< plandl-view name="terrace" alt="Terrace with furniture" >}}

`TERRACE` uses the same grid-index geometry as `ROOM`, but its outer walls have zero thickness. Its inferred inner dimensions are therefore the full grid span.

```text
GRID LINES_X=[6m] LINES_Y=[4m]
TERRACE NAME=Patio X=[0,1] Y=[0,1] INFER INNER_DIMENSIONS=[6m,4m] AREA=24sqm
TABLE WALL=Patio_SOUTH OFFSET=1500mm PADDING=500mm WIDTH=1800mm DEPTH=1000mm
CABINET WALL=Patio_WEST OFFSET=1000mm PADDING=200mm WIDTH=1200mm DEPTH=600mm
```
