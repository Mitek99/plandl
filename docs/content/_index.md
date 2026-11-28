---
title: PlanDL
---

# Floor plans on a grid.

PlanDL is a small, strict, LLM-friendly language for floor plans. Rooms select grid rectangles, doors connect named rooms, and furniture attaches to named walls. The compiler infers dimensions, areas, and access, checks that the plan makes sense as a home (every room reachable, nothing blocking a door, windows and fixtures where they belong), and renders SVG.

[Read the documentation](docs/) · [See the examples](examples/) · [View on GitHub](https://github.com/Mitek99/plandl)

## Deliberately small

[ArchLang](https://github.com/ChanMeng666/archlang) is a more advanced project with a broader language and toolchain. PlanDL takes inspiration from its deterministic compiler and agent-friendly diagnostics, but aims only to provide a compact grid language, normalized JSON, validation, and SVG rendering. **We are not trying to boil the ocean.**

## Try PlanDL

Edit the [reference house](examples/reference-house/) and watch the real parser, validator, and SVG renderer update the plan in your browser.

{{< plandl-playground >}}
