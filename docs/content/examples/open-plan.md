---
title: Open plan
---

![Open living room and kitchen](../open-plan.svg)

The divider starts partway along `external_south`. The exterior walls remain unsplit in source, while both rooms use the necessary wall subsegments. The front door uses the external-door width default.

```text
LET living_width = 5000mm
LET kitchen_width = living_width * 0.6
LET total_width = living_width + kitchen_width
LET plan_depth = 5000mm
LET sofa_width = living_width / 2

WALL EXTERNAL external_south "South exterior" DIRECTION 90 LENGTH total_width
DOOR EXTERNAL front_door "Front door" OFFSET 800mm SIDE LEFT OPENING_TYPE HINGED
WALL EXTERNAL external_east "East exterior" START external_south.end DIRECTION 0 LENGTH plan_depth
WALL EXTERNAL external_north "North exterior" START external_east.end DIRECTION 270 LENGTH total_width
WINDOW living_window "Living room window" OFFSET kitchen_width + 1000mm WIDTH 1800mm SIDE LEFT
OBJECT kitchen_counter "Kitchen counter" KIND COUNTER OFFSET 500mm SIDE LEFT GAP 0mm SIZE 2000mm X default_kitchen_counter_depth
WALL EXTERNAL external_west "West exterior" START external_north.end DIRECTION 180 LENGTH plan_depth
OBJECT sofa "Sofa" KIND SOFA OFFSET 1200mm SIDE LEFT GAP 100mm SIZE sofa_width X 900mm
WALL VIRTUAL open_divider "Open living kitchen boundary" START external_south.at(living_width) DIRECTION 0 LENGTH plan_depth
ROOM living_room "Living room" WALLS [external_south, open_divider, external_north, external_west]
ROOM kitchen "Kitchen" WALLS [external_south, external_east, external_north, open_divider]
```
