---
title: PlanDL
---

# Floor plans on a grid.

PlanDL is a small, strict, LLM-friendly language for spatial plans. Rooms and terraces select grid rectangles, compound spaces merge rectangles, and furniture attaches to named room walls. The compiler infers dimensions and areas, validates the geometry, and renders SVG.

[Read the documentation](docs/) · [See the examples](examples/) · [View on GitHub](https://github.com/Mitek99/plandl)

## Deliberately small

[ArchLang](https://github.com/ChanMeng666/archlang) is a more advanced project with a broader language and toolchain. PlanDL takes inspiration from its deterministic compiler and agent-friendly diagnostics, but aims only to provide a compact grid language, normalized JSON, validation, and SVG rendering. **We are not trying to boil the ocean.**

## Try PlanDL

Edit the definition and watch the real parser, validator, and SVG renderer update the plan in your browser.

{{< plandl-playground >}}
