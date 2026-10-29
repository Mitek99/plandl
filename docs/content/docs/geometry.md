---
title: Geometry and validation
weight: 4
---

## Reference faces and directions

Every wall has a directed reference face from start to end. The left face is the reference face, and physical thickness extends to the right. `LEFT` and `RIGHT` always assume the observer is looking from wall start toward wall end.

Wall length and attachment offsets run along the reference face. Opening offsets target the leading edge nearest the wall start, not the opening center. Furniture clearance is measured from the selected physical face.

Exterior shell walls run counter-clockwise with the building interior on their `LEFT`. Their declared length is measured along the interior reference face, and thickness extends outward to the `RIGHT`. Consequently, four 10 m exterior walls with 0.5 m thickness describe a 10 × 10 m interior with 100 m² internal area and an 11 × 11 m exterior.

## Auto-extending walls

Omitting `LENGTH` casts a ray from the wall start along its direction. The wall stops at the nearest intersection with an explicitly sized wall, even when that obstacle is declared later. Auto walls then become obstacles in source order: the first auto wall extends, and a later auto wall can stop at it, forming a T-junction rather than a crossing.

The nearest intersection must be farther than the wall's own start. A wall that hits nothing is invalid and reports `UNTERMINATED_WALL`. Resolved JSON records both the derived length and `autoLength: true`. Attachment spans and `.at(offset)` references are checked after auto-extension.

## Connected wall graph

The first wall establishes the plan's implicit origin. Every other wall attaches to an earlier wall, so one source file describes one connected wall graph. Dependencies are sequential: later declarations cannot be referenced, and dependency cycles cannot be expressed.

## T-junctions

Authors do not split a wall at a T-junction. The validator internally splits walls wherever another wall endpoint meets them. Different rooms can therefore reference the same exterior wall while using different portions of it.

A room's wall set must select exactly one bounded face. Extra boundaries produce an ambiguity error; an open loop produces a closure error.

## Validation

The resolver checks, among other rules:

- Unknown, duplicate, and forward references.
- Invalid lengths, offsets, sizes, and expressions.
- Wall crossings and collinear overlaps.
- Room closure and ambiguous room boundaries.
- Attachments extending beyond their host wall.
- Windows and openings extending above their host wall.
- Physical attachments to virtual walls.

Normalized JSON always includes explicit resolved hosts and geometry, making downstream consumption independent of source-order conveniences.
