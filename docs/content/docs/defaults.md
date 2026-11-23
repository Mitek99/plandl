---
title: Wall defaults
weight: 5
---

`DEFAULT` overrides wall thicknesses for the whole plan. Values are lengths and must be greater than zero. Any omitted setting keeps its built-in value.

| Setting | Default | Purpose |
|---|---:|---|
| `INNER_THICKNESS` | 100mm | Non-bearing inner walls and the inside portion of non-bearing outer walls |
| `BEARING_THICKNESS` | 250mm | Bearing inner walls and the inside portion of bearing outer walls |
| `OUTER_THICKNESS` | 400mm | Total outer wall thickness |

```text
DEFAULT INNER_THICKNESS=120mm BEARING_THICKNESS=300mm OUTER_THICKNESS=450mm
```

`DEFAULT` may appear once. `OUTER_THICKNESS` must be at least half of the larger inner or bearing thickness so that the exterior projection is nonnegative.

Furniture depth defaults are specific to each furniture command and can be overridden with `DEPTH`.

Use `plandl defaults --json` for the machine-readable wall defaults. A generated copy is also available at [defaults.json](../../defaults.json).
