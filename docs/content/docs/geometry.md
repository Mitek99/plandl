---
title: Geometry and validation
weight: 4
---

## Reference faces and directions

Every wall has a directed reference face from start to end. The left face is the reference face, and physical thickness extends to the right. `LEFT` and `RIGHT` always assume the observer is looking from wall start toward wall end.

Wall length and attachment offsets run along the reference face. Opening offsets target the leading edge nearest the wall start, not the opening center. Furniture clearance is measured from the selected physical face.

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
