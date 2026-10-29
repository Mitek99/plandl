---
title: Default variables
weight: 5
---

Built-in defaults are predeclared, read-only, and measured in millimetres. User variables cannot use the reserved `default_` prefix. Explicit properties override defaults.

| Variable | Value | Purpose |
|---|---:|---|
| `default_external_thickness` | 400 | External wall thickness |
| `default_internal_thickness` | 100 | Internal wall thickness |
| `default_terrace_thickness` | 50 | Terrace guardrail thickness |
| `default_wall_height` | 2700 | External and internal wall height |
| `default_terrace_height` | 1100 | Terrace guardrail height |
| `default_internal_door_width` | 700 | Internal door width |
| `default_external_door_width` | 800 | External door width |
| `default_door_height` | 2100 | Door height |
| `default_window_height` | 1500 | Window height |
| `default_window_sill_height` | 900 | Window sill above finished floor |
| `default_opening_height` | 2100 | Cased opening height |
| `default_kitchen_counter_depth` | 650 | Kitchen counter depth |

Use `plandl defaults --json` for the machine-readable list. A generated copy is also available at `/plandl/defaults.json`.
