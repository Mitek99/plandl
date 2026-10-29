---
title: Terrace
---

![Terrace with guardrails](../terrace.svg)

`TERRACE` walls represent guardrails. They use the guardrail thickness and height defaults and render with regularly spaced posts.

```text
LET terrace_width = 6000mm
LET terrace_depth = 4000mm

WALL TERRACE terrace_south "South guardrail" DIRECTION 90 LENGTH terrace_width
WALL TERRACE terrace_east "East guardrail" START terrace_south.end DIRECTION 0 LENGTH terrace_depth
WALL TERRACE terrace_north "North guardrail" START terrace_east.end DIRECTION 270 LENGTH terrace_width
WALL TERRACE terrace_west "West guardrail" START terrace_north.end DIRECTION 180 LENGTH terrace_depth
OBJECT outdoor_chair "Outdoor chair" KIND CHAIR OFFSET 500mm SIDE LEFT GAP 200mm SIZE 600mm X 600mm
ROOM terrace "Terrace" WALLS [terrace_south, terrace_east, terrace_north, terrace_west]
```
