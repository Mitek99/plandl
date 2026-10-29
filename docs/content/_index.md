---
title: PlanDL
---

# Plans, defined relatively.

PlanDL is a small, strict, LLM-friendly language for spatial plans. Walls connect to earlier walls, rooms reference wall boundaries, and objects attach to wall faces. PlanDL source has no absolute coordinates.

[Read the documentation](docs/) · [See the examples](examples/) · [View on GitHub](https://github.com/Mitek99/plandl)

## Deliberately small

[ArchLang](https://github.com/ChanMeng666/archlang) is a more advanced project with a broader language and toolchain. PlanDL takes inspiration from its deterministic compiler and agent-friendly diagnostics, but aims only to provide a compact wall-graph language, normalized JSON, validation, and SVG rendering. **We are not trying to boil the ocean.**

![Open living room and kitchen rendered from PlanDL](examples/open-plan.svg)

```text
WALL EXTERNAL external_south "South exterior" DIRECTION 90 LENGTH total_width
WALL EXTERNAL external_east "East exterior" START external_south.end DIRECTION 0 LENGTH plan_depth
WALL VIRTUAL open_divider "Open living kitchen boundary" START external_south.at(living_width) DIRECTION 0 LENGTH plan_depth
```
