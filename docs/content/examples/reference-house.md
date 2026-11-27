---
title: FH-114M reference house
aliases:
  - /reference-house/
---

{{< plandl-view name="reference-house" alt="Schematic PlanDL conversion of the FH-114M reference house" >}}

This is a schematic conversion of the [FH-114M reference floor plan](https://full-houses.ru/media/images/projects/proekt-fh-114m-mode/mode-pryamoj-l.webp). It keeps the 11.875 m square envelope and the arrangement of bedrooms, bathrooms, laundry, hall, storage, and the combined living room and kitchen. The grid mixes absolute and relative lines, so the envelope is fixed at 11.875 m while the bays inside are measured from each side.

The raster image does not give exact partition dimensions, so the grid lines and areas are approximate. Every room has a `TYPE`, every door is written with `BETWEEN`, and the plan passes `plandl check --strict`: every room can be reached, no furniture stands in a door swing, and each room has its window and fixtures. An earlier version of this example, written before those checks existed, had three rooms with no door and a bedroom entered through the WC.

The same definition is editable in the [front-page playground](../../#try-plandl).

{{< plandl-source name="reference-house" >}}
