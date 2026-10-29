---
title: PlanDL
---

# Plans, defined relatively.

PlanDL is a small, strict, LLM-friendly language for spatial plans. Walls connect to earlier walls, rooms reference wall boundaries, and objects attach to wall faces. PlanDL source has no absolute coordinates.

[Read the documentation](docs/) · [See the examples](examples/) · [View on GitHub](https://github.com/Mitek99/plandl)

## Deliberately small

[ArchLang](https://github.com/ChanMeng666/archlang) is a more advanced project with a broader language and toolchain. PlanDL takes inspiration from its deterministic compiler and agent-friendly diagnostics, but aims only to provide a compact wall-graph language, normalized JSON, validation, and SVG rendering. **We are not trying to boil the ocean.**

## Try PlanDL

Edit the definition and watch the real parser, validator, and SVG renderer update the plan in your browser. This approximate conversion of the supplied floor-plan image preserves its 11.875 m envelope and labeled room areas.

{{< plandl-playground >}}
