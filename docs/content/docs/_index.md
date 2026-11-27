---
title: Introduction
weight: 1
---

PlanDL is a line-oriented definition language for grid-based floor plans. It is designed for straightforward generation, parsing, validation, and repair by people and language models. The grid and wall-relative placement keep geometry simple enough that a model rarely gets it wrong, and the checker catches what geometry cannot: rooms nobody can enter, furniture in the way of doors, rooms without windows or fixtures.

## Core ideas

- One command per line, with space-separated `KEY=value` parameters.
- A leading rectangular grid defines all legal wall coordinates.
- Rooms and terraces select rectangles using grid-line indices.
- Compound rooms merge rectangles and suppress their shared walls.
- Inner and bearing walls are centered; outer walls use an asymmetric thickness rule.
- The compiler infers grid dimensions, room dimensions, and areas.
- Rooms can have a type, which tells the checker what the room is for.
- Doors connect two named spaces with `DOOR BETWEEN=[Hall,Bedroom]`; the compiler finds the wall.
- Furniture and windows attach to named compass walls.
- `plandl check` reports errors and planning warnings, with numbers, and `plandl infer` writes computed facts back into the source.
- Deterministic normalized JSON, diagnostics, and SVG output.

## Scope

ArchLang is more advanced and supports a much broader floor-plan workflow. PlanDL is intentionally not a general scripting language, a BIM exchange format, an automatic layout engine, or a replacement for IFC. Its small grammar and strict geometric rules are features.

Start with [Getting started](getting-started/), then read the [language reference](language/).
