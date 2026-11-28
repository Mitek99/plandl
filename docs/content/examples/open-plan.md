---
title: Open plan
seoTitle: "Open plan: living room and kitchen floor plan"
description: "An open-plan living room and kitchen in PlanDL: a door placed by the compiler, room types, required kitchen fixtures, and values written by plandl infer."
aliases:
  - /open-plan/
---

{{< plandl-view name="open-plan" alt="Open living room and kitchen" >}}

A living room and a kitchen on a two-column grid. The entrance is written as `DOOR BETWEEN=[OUTSIDE,Living]`, so the compiler finds the outer wall and places it; the door between the rooms is written on a named wall and generates its kitchen-side counterpart. Both rooms have a `TYPE`, so `plandl check` also confirms each has a window, the kitchen has its sink, oven, and fridge, and every room can be reached.

The values after `INFER` were written by `plandl infer`: outer and inner dimensions, areas, which spaces each room opens onto, where the `BETWEEN` door went, and the standard depth of furniture written without `DEPTH`.

{{< plandl-source name="open-plan" >}}
