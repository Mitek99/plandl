---
title: Geometry and validation
weight: 4
---

## Grid coordinates

The grid begins at zero. Each entry in `STEPS_X` or `STEPS_Y` adds one grid line after accumulating that step. For example, `[3m,2m,3m]` produces X coordinates 0, 3m, 5m, and 8m.

Rooms select rectangles using grid-line indices, not lengths. `X=[1,3]` in that grid selects the span from X=3m to X=8m. Rectangles must be nonempty and cannot overlap other declared rooms or terraces.

## Wall thickness

Inner and bearing walls are centered on their grid lines. Their default thicknesses are 100mm and 250mm respectively.

Outer walls use an asymmetric placement so an outer wall can continue into an internal partition without a step on the interior surface:

- On a non-bearing line, half of `INNER_THICKNESS` is inside the building. The default is 50mm.
- On a bearing line, half of `BEARING_THICKNESS` is inside. The default is 125mm.
- The remainder of `OUTER_THICKNESS` is outside. The defaults therefore give 350mm outside on a non-bearing line and 275mm on a bearing line.

Grid outer dimensions include these exterior projections on both sides. An 8m × 4m grid with default non-bearing boundary lines consequently has 8.7m × 4.7m outer dimensions, a 40.89m² outer area, and a 26.8m perimeter.

Terrace outer walls have zero thickness. A wall between a room and a terrace uses outer-wall placement on the room side.

## Compound spaces

Merging spaces suppresses walls between members of the same compound. A compound parent's inferred area is the aggregate of its members, including the strips opened by removing their shared walls. It has no single inner-dimensions pair.

Merges must connect spaces of the same command type. A child can have only one parent, and cycles are rejected.

## Furniture coordinates

Furniture uses a local wall coordinate system. Offset and width run along the inner wall face from its lowest X or Y coordinate; padding and depth run into the room. A bed's headboard is therefore at the padding line, regardless of which compass wall hosts it.

## Openings

Windows, doors, and openings use the same inner wall coordinates as furniture. Their resolved `start` and `end` points lie on the grid centerline so the renderer can cut through the complete wall thickness.

An inner door has two resolved definitions: the explicit source definition and an inferred definition for the adjoining room. Both refer to the same physical span. The inferred hinge and swing account for viewing the wall from the opposite side, so both definitions render one consistent door leaf.

## Validation

The resolver checks, among other rules:

- Exactly one leading grid and valid positive steps.
- Unitless, in-range grid indices and nonempty room ranges.
- Duplicate names and overlapping spaces.
- Unknown, mixed-type, repeated, and cyclic merges.
- Positive thicknesses and sufficient outer thickness.
- Valid wall references, lengths, offsets, padding, and furniture sizes.
- Furniture extending beyond its selected wall segment or room.
- Openings extending beyond their selected wall or an adjoining room.

Normalized JSON includes resolved grid coordinates, room bounds, aggregate areas, wall geometry, furniture footprints, and structured diagnostics.
