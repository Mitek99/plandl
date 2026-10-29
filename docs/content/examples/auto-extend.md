---
title: Auto-extending walls
---

![Exterior and internal walls resolved by auto-extension](../auto-extend.svg)

`west` closes the exterior shell without an explicit `LENGTH`. The first internal partition extends to the north exterior. The second then stops at the first partition, producing a T-junction rather than a crossing.

```text
LET house_width = 10000mm
LET house_depth = 10000mm
LET partition_offset = 4000mm
LET horizontal_offset = 6000mm

WALL EXTERNAL south "South exterior" DIRECTION 90 LENGTH house_width
WALL EXTERNAL east "East exterior" START south.end DIRECTION 0 LENGTH house_depth
WALL EXTERNAL north "North exterior" START east.end DIRECTION 270 LENGTH house_width
WALL EXTERNAL west "West exterior" START north.end DIRECTION 180
WALL INTERNAL vertical_partition "Vertical partition" START south.at(partition_offset) DIRECTION 0
WALL INTERNAL horizontal_partition "Horizontal partition" START west.at(horizontal_offset) DIRECTION 90
ROOM southwest "Southwest room" WALLS [south, vertical_partition, horizontal_partition, west]
ROOM northwest "Northwest room" WALLS [horizontal_partition, vertical_partition, north, west]
ROOM east_room "East room" WALLS [south, east, north, vertical_partition]
```
