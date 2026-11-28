---
title: PlanDL
---

<section class="pd-hero">
<div class="pd-hero-text">

# Floor plans on a grid.

<p class="pd-lead">PlanDL is a small, strict, LLM-friendly language for floor plans.</p>

<p class="pd-actions"><a class="pd-key pd-key--primary" href="docs/">Read the documentation</a> <a class="pd-key" href="examples/">See the examples</a></p>

<p class="pd-aside"><a href="https://github.com/Mitek99/plandl">View on GitHub</a></p>

</div>
<div class="pd-hero-plan">

{{< plandl-view name="step-by-step/07-bedroom-furniture" alt="A small house with a living room and a bedroom, furnished, as built in the step-by-step example" >}}

</div>
</section>

<section class="pd-statement">

Rooms select grid rectangles, doors connect named rooms, and furniture attaches to named walls. The compiler infers dimensions, areas, and access, checks that the plan makes sense as a home (every room reachable, nothing blocking a door, windows and fixtures where they belong), and renders SVG.

</section>

<section class="pd-small">

## Deliberately small

[ArchLang](https://github.com/ChanMeng666/archlang) is a more advanced project with a broader language and toolchain. PlanDL takes inspiration from its deterministic compiler and agent-friendly diagnostics, but aims only to provide a compact grid language, normalized JSON, validation, and SVG rendering. **We are not trying to boil the ocean.**

</section>

<section class="pd-try">
<div class="pd-try-head">

## Try PlanDL

Edit the schematic [FH-114M reference-house conversion](examples/reference-house/) and watch the real parser, validator, and SVG renderer update the plan in your browser.

</div>

{{< plandl-playground >}}

</section>
