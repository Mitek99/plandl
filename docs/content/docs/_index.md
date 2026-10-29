---
title: Introduction
weight: 1
---

PlanDL is a line-oriented definition language for relative spatial plans. It is designed for straightforward generation, parsing, validation, and repair by people and language models.

## Core ideas

- One definition per line, with uppercase reserved words and quoted display names.
- Variables and formulas resolved sequentially.
- No absolute coordinates: the first wall establishes an implicit origin.
- Every subsequent wall attaches to an earlier wall.
- Whole walls may meet at T-junctions; the validator derives the necessary subsegments.
- Rooms explicitly reference the walls that contain their boundaries.
- Doors, windows, openings, and objects attach to wall faces.
- Deterministic normalized JSON, diagnostics, and SVG output.

## Scope

ArchLang is more advanced and supports a much broader floor-plan workflow. PlanDL is intentionally not a general scripting language, a BIM exchange format, an automatic layout engine, or a replacement for IFC. Its small grammar and strict geometric rules are features.

Start with [Getting started](getting-started/), then read the [language reference](language/).
