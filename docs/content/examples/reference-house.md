---
title: Reference house
seoTitle: "Reference house: a single-storey floor plan"
description: "A schematic single-storey house written in PlanDL: bedrooms, bathrooms, laundry, and a living room with kitchen, passing plandl check --strict."
aliases:
  - /reference-house/
---

{{< plandl-view name="reference-house" alt="PlanDL plan of a single-storey reference house" >}}

This is a schematic single-storey house on an 11.875 m square envelope, with bedrooms, bathrooms, laundry, hall, storage, and a combined living room and kitchen. The grid mixes absolute and relative lines, so the envelope is fixed at 11.875 m while the bays inside are measured from each side.

Every room has a `TYPE`, every door is written with `BETWEEN`, and the plan passes `plandl check --strict`: every room can be reached, no furniture stands in a door swing, and each room has its window and fixtures. An earlier version of this example, written before those checks existed, had three rooms with no door and a bedroom entered through the WC.

The same definition is editable in the [front-page playground](../../#try-plandl).

{{< plandl-source name="reference-house" >}}
