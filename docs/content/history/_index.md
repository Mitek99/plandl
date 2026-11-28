---
title: History
seoTitle: "History: versions, reviews, and decisions"
description: "How PlanDL got its shape: language versions, the agent reviews that tested them, and the design decisions that followed."
---

How PlanDL got its shape: the versions, the reviews that tested them, and the decisions that followed. Newest first.

## Reviews

- [Agent review of PlanDL 0.2](agent-review-0-2/) (27 November 2026). Eleven LLM agents wrote floor plans from the spec alone. All of them validated, but 8 of 11 had defects that an architect would redline and the validator could not see. The review led to the checks, room types, `BETWEEN` doors and `plandl infer` in 0.4.

## Versions

| Version | Date | What changed |
|---|---|---|
| 0.4 | 27 November 2026 | `check` reports planning warnings with numbers and a room table, and `--strict` fails on them. Rooms take an optional `TYPE`. Doors connect two named spaces with `BETWEEN`. `plandl infer` writes computed facts back after `INFER`. Adds wardrobe, washer and dishwasher, and door swing arcs. |
| 0.3 | 27 November 2026 | `GRID` takes `LINES_X` and `LINES_Y`, with absolute or relative positions. |
| 0.2 | 23 November 2026 | Redesign around a rectangular grid. Rooms select grid rectangles, furniture and openings attach to named compass walls, and walls take one of three automatic thicknesses. |
| 0.1 | 29 October 2026 | The first language, written wall by wall. Each wall referenced earlier walls by direction and length, and walls could extend automatically. |
