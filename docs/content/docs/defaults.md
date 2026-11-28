---
title: Defaults
weight: 6
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

## Furniture depths

Each furniture command has a standard depth, used when `DEPTH` is omitted. `plandl infer` writes the depth it used after `INFER`.

| Command | Standard depth | Typical width along the wall |
|---|---:|---|
| `BED` | 2000mm | 900mm single, 1400–1800mm double |
| `DESK` | 600mm | 1200–1600mm |
| `CABINET` | 600mm | any; kitchen base units 600mm each |
| `SINK` | 600mm | 600–1000mm |
| `FRIDGE` | 700mm | 600–700mm |
| `OVEN` | 600mm | 600mm |
| `SOFA` | 900mm | 1800–2600mm |
| `TABLE` | 900mm | 1200–1800mm; `WIDTH` × `DEPTH` is the tabletop, and chairs are drawn around it, so keep about 600mm clear on each side |
| `ISLAND` | 900mm | 1200–2000mm |
| `TOILET` | 700mm | 400–600mm |
| `SHOWER` | 900mm | 800–1000mm |
| `BATHTUB` | 800mm | 1500–1800mm |
| `WARDROBE` | 600mm | 1000–2400mm |
| `WASHER` | 600mm | 600mm |
| `DISHWASHER` | 600mm | 450–600mm |

Use `plandl defaults --json` for the machine-readable wall defaults. A generated copy is also available at [defaults.json](../../defaults.json).
