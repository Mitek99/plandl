---
title: Agent review of PlanDL 0.2
description: "Eleven LLM agents wrote floor plans from the PlanDL 0.2 spec. All validated, but 8 of 11 had defects an architect would redline. What changed after."
linkTitle: Agent review of 0.2
date: 2026-11-27
sidebar:
  hide: true
---

{{< review-style >}}

Can a language built around grids and wall-relative placement get LLM agents to produce coherent floor plans? This review read the 0.2 language and its resolver. It then gave 11 agent runs nothing but the output of `plandl spec` and a natural-language brief, audited every result, and redlined the defects.

{{< callout type="info" >}}
This is a record of PlanDL 0.2 as it stood on 27 November 2026. The plans, syntax and drawings below are 0.2 (`STEPS_X`, `DOOR WALL=…`, no warnings). Most of the recommendations shipped the same day in 0.4. See [What came of it](#what-came-of-it) at the end, and [Checks](../../docs/checks/) for the current behaviour.
{{< /callout >}}

## The verdict

**Did it succeed? At syntax and geometry, yes. At coherent plans, not yet.** The grid did what it was designed to do. Every agent wrote a valid plan from a 4 KB spec, 8 of 11 on the first `check`. Not one plan had an unclosed room, overlapping rooms, a wrong wall thickness or an opening off its wall.

Coherence lives in relationships, though: which room opens onto which, what blocks what, how much floor goes to corridors. The language could not express those relationships and the validator never looked at them. 8 of the 11 valid plans contained a defect an architect would redline. The project's own reference house had three rooms with no door at all.

**What should change? Teach the checker to see relations before changing the grammar.** Agents knew what to worry about. Every one of them noted that overlaps and door swings went unchecked, or that it could not tell whether they were checked. Several guessed their own defects correctly. They lacked an instrument, not judgement.

<div class="review-stats">
  <div class="review-stat"><b>11 / 11</b><span>agent plans validated; at most 4 checks, every error fixed in one edit</span></div>
  <div class="review-stat"><b class="red">8 / 11</b><span>valid plans with at least one hard defect (access, collision, door swing, program)</span></div>
  <div class="review-stat"><b class="red">6 / 11</b><span>plans spending 19–23% of net area on halls and corridors</span></div>
  <div class="review-stat"><b>0</b><span>warnings <code>check</code> could emit in 0.2; it had errors only, and said only "valid"</span></div>
</div>

## Exhibit A: what "valid" meant

Before the experiment, a 13-line probe put one defect on almost every line. `check` printed `p1.plandl: valid`. The redlines on this page come from a scratch audit (about 330 lines of JavaScript over `plandl describe` JSON) that was written for the review.

{{< review-sheet src="probe.svg" alt="Probe plan: kitchen, bedroom and a narrow sealed bedroom, with eleven red markers" caption="probe · check: valid" >}}
```text
GRID STEPS_X=[4m,3m,1.3m] STEPS_Y=[4m]
ROOM NAME=Kitchen X=[0,1] Y=[0,1]
ROOM NAME=Bedroom X=[1,2] Y=[0,1]
ROOM NAME=Bedroom2 X=[2,3] Y=[0,1]
DOOR WALL=Kitchen_SOUTH OFFSET=1m WIDTH=900mm
WINDOW WALL=Kitchen_EAST OFFSET=1m WIDTH=1.5m
DOOR WALL=Bedroom_SOUTH OFFSET=500mm WIDTH=800mm
DOOR WALL=Bedroom_SOUTH OFFSET=900mm WIDTH=800mm
CABINET WALL=Bedroom_SOUTH OFFSET=400mm WIDTH=1200mm DEPTH=600mm
BED WALL=Bedroom_NORTH OFFSET=500mm WIDTH=1600mm
SOFA WALL=Bedroom_WEST OFFSET=1000mm WIDTH=2000mm
TOILET WALL=Kitchen_NORTH OFFSET=500mm WIDTH=600mm
BED WALL=Bedroom2_NORTH OFFSET=0 WIDTH=1100mm
```

- {{< pin 1 >}}Bedroom2, 1.2 m wide, has no door at all.
- {{< pin 2 >}}A window sits in the wall between the kitchen and the bedroom.
- {{< pin 6 >}}The bed and the sofa overlap by 0.44 m².
- {{< pin 7 >}}A cabinet stands across both bedroom doors, and the two doors overlap each other on the same wall.
- {{< pin 10 >}}The toilet is in the kitchen.
{{< /review-sheet >}}

## The experiment

Each agent ran as a subagent that could read only `plandl spec`. It received one brief and could run `check`. It had to save every attempt and log the validator output. Three runs could also render the plan to PNG and critique it, up to three times. The same audit ran on every final plan and on the reference house, and every render was then inspected by eye.

| Brief | Runs |
|---|---|
| 2-bed flat, about 70 m², open kitchen-living, entrance hall | A1 (Sonnet), H1 (Haiku), R1 (Sonnet with render loop) |
| 3-bed house, two bathrooms including an en-suite, kitchen-diner, utility | A2, H2, R2 |
| 4-bed house, about 140 m², suite with walk-in wardrobe and en-suite, guest WC, island kitchen, south terrace | A5, R5 |
| Studio, about 30 m², shower room, balcony | A3 |
| 1-bed flat, about 45 m², closed kitchen, office corner, store | A4 |
| Wheelchair-accessible 2-bed, 90 cm doors, 1.5 m turning circles | A6 |

**How defects were judged.** The audit checked reachability from the entrance, furniture overlap, furniture inside a door's swing square, colliding door swings, windows on internal walls, windowless habitable rooms, missing fixtures, and clearance strips. **Hard** defects (red pins) are access, collision, door swing, program and daylight. **Soft** defects (amber pins) are blocked approaches. Room roles came from names, so the audit was heuristic; every red mark was checked against the render, and one false-positive rule was removed. The sample is small (n = 11), so read the numbers as a pattern, not a benchmark.

## Every run at a glance

| Run | Brief | Model | Checks | Errors hit | Net m² | Circulation | Hard | What a reviewer would say |
|---|---|---|--:|---|--:|--:|--:|---|
| A1 | 2-bed flat | Sonnet | 3 | `FURNITURE_OUTSIDE_WALL` ×2 | 66.0 | 6% | 2 | Bed2 is entered only through the kitchen. The entrance and bath doors swing into each other. |
| H1 | 2-bed flat | Haiku | 1 | none | 65.9 | 20% | 1 | The sofa overlaps the dining table. The hall is a 13 m² dead-end strip. |
| R1 | 2-bed flat | Sonnet, render | 3 | `ROOM_OVERLAP` ×2 (merge) | 71.1 | 16% | 0 | Clean. The render caught three doors swinging into the 1.2 m hall. |
| A2 | 3-bed house | Sonnet | 1 | none | 118.6 | 20% | 0 | Hall and corridor take 23 m². Bath and en-suite are both 8 m² because they share a grid band. |
| H2 | 3-bed house | Haiku | 1 | none | 149.9 | 23% | 1 | A 34.5 m² hall. Bed2, bath and en-suite are each exactly 9.86 m². The bathtub overlaps the basin. |
| R2 | 3-bed house | Sonnet, render | 4 | `ROOM_OVERLAP` ×3 (merge), `FURNITURE_OUTSIDE_WALL` | 131.4 | 22% | 1 | The master and en-suite doors collide. Two corridors and a hall take 28 m². |
| A5 | 4-bed house | Sonnet | 1 | none | 140.2 | 12% | 2 | The kitchen is an internal room with no window. Toilet and basin touch in the WC. |
| R5 | 4-bed house | Sonnet, render | 2 | none | 140.4 | 19% | 1 | A wardrobe stands in the swing of Bed4's door. A 17 m² corridor. The dining table blocks two openings. |
| A3 | Studio | Sonnet | 3 | none | 28.1 | 0% | 4 | The cabinet overlaps the desk, the sofa sits in two door swings, and the kitchen has a sink only. |
| A4 | 1-bed flat | Sonnet | 1 | none | 43.4 | 7% | 0 | Clean by audit. The kitchen is 1.9 × 2.3 m with a 0.7 m aisle. |
| A6 | Accessible 2-bed | Sonnet | 1 | none | 81.7 | 21% | 1 | The living-room doors collide. Turning circles cannot be stated or checked. |
| REF | Reference house | hand-written | – | none | 132.0 | 6% | 10 | Wardrobe, Laundry and Shower have no doors. A bedroom is entered through the WC. The fridge overlaps a cabinet and the island. |

Check counts include two wasted runs where an agent's own `sed` edit failed (A1, R2). A3 ran `check` three times and every run was valid. Circulation counts rooms named hall, corridor or entrance; a common target for a dwelling is 10–15%.

## Representative plans, redlined

Red pins are hard defects and amber pins are blocked approaches. The drawings are unchanged `plandl compile` output from 0.2 with the audit overlay added.

{{< review-sheet src="reference-house.svg" alt="Reference house with thirteen markers, three rooms shaded red as unreachable" caption="reference house · hand-written · check: valid" >}}
### The reference house had the same problems

This shows the gap was not about LLMs. Without relational checks, a careful human author ships the same defects.

- {{< pin 1 >}}Wardrobe, {{< pin 2 >}}Laundry and {{< pin 3 >}}Shower have no door or opening.
- {{< pin 4 >}}BedroomNorthWest's only door opens into the WC: `OFFSET=3000mm` on its south wall lands on the WC's wall.
- {{< pin 6 >}}The living-room cabinet and the kitchen fridge overlap by 0.40 m². The island also touches the fridge {{< pin 7 >}} and the table {{< pin 5 >}}.
- {{< pin 8 >}}The bathtub fills the swing of the bathroom door; the room is only 1.53 m deep.
- {{< pin 9 >}}The WC basin is inside the WC door's swing, and {{< pin 10 >}} the entrance and bedroom doors collide in the hall.
{{< /review-sheet >}}

{{< review-sheet src="a3.svg" alt="Studio plan with markers on a cabinet-desk overlap, the sofa and the kitchen" caption="A3 · studio · Sonnet · 3 checks, all valid" >}}
### Wall-local coordinates move errors into corners

Each wall is its own one-dimensional coordinate system. Nothing floats in mid-air any more, but agents never reason about the corner where two walls meet. **All four furniture collisions** in agent plans are between items on perpendicular walls, and so are all three cases of furniture inside a door swing.

- {{< pin 1 >}}A cabinet on the west wall overlaps a desk on the north wall.
- {{< pin 2 >}}The sofa on the east wall sits in the swing of the bath door and {{< pin 3 >}} of the balcony door.
- {{< pin 4 >}}The kitchen has a sink but no cooker or fridge. The agent left them out because the spec did not give default sizes.
{{< /review-sheet >}}

{{< review-sheet src="a1.svg" alt="Two-bedroom flat with Bed2 shaded red and a door collision marker in the hall" caption="A1 · 2-bed flat · Sonnet · 3 checks" >}}
### Reachable is not the same as well connected

- {{< pin 1 >}}Bed2's only door opens off the kitchen. The agent noticed this itself ("Bed2 is only reachable through the kitchen") and still shipped it, because nothing in the loop pushed back.
- {{< pin 2 >}}The entrance door and the bath door swing into the same corner of a 1.3 m hall.
- {{< pin 3 soft >}}A hall cabinet partly blocks the opening into the living room.
{{< /review-sheet >}}

{{< review-sheet src="h2.svg" alt="Three-bedroom house with a very wide central hall and three identical rooms along the north" caption="H2 · 3-bed house · Haiku · 1 check" >}}
### The grid pulls agents toward uniform bands

9 of 11 plans are horizontal bands of rooms, and 7 of those run a corridor band through the middle. Agents chose coarse grids, and a row has one depth, so every room in a band shares that depth whatever its purpose. Here Bed2, the family bathroom and the en-suite are each exactly 9.86 m². The hall takes 34.5 m², 23% of the plan.

- {{< pin 1 >}}The bathtub overlaps the basin.
- {{< pin "–" text >}}Bed3 at 8.4 m² sits beside a 20 m² master bedroom. Sizes follow column widths, not the brief.
{{< /review-sheet >}}

{{< review-sheet src="r1-before.svg" alt="R1 before: door leaves swing into the hall" label="attempt 2: doors on Hall_SOUTH, default INWARD" src2="r1.svg" alt2="R1 after: door leaves swing into the rooms" label2="final: the same doors with OPENING=OUTWARD" caption="R1 · 2-bed flat · Sonnet with render loop · before and after the first render" >}}
### One door, two ways to write it, opposite keywords

R1 declared the bedroom and bath doors from the hall side. Under the spec, `OPENING=INWARD` (the default) then meant "into the hall", so three 0.8–1.0 m leaves swung into a 1.2 m corridor. `check` passed, and only the render showed it. Mirrored inference is elegant for the compiler, but it let an author state the same physical door from either room, and the keywords flipped meaning with the choice.
{{< /review-sheet >}}

## What the language prevented, and what it could not

**Prevented, and it showed.**

- Unclosed rooms, gaps between walls and misaligned partitions: walls exist only on grid lines.
- Overlapping rooms (`ROOM_OVERLAP`) and rooms with no interior.
- Wall-thickness arithmetic. No agent touched `DEFAULT` or `BEARING`, and none produced a thickness error.
- Openings off their wall and furniture outside its room. `FURNITURE_OUTSIDE_WALL` fired three times, and each was fixed in one edit.
- Inconsistent two-sided doors, through mirror inference.
- A high learning cost. A 4 KB spec was enough for Haiku to write a valid 150 m² house on the first try.

**Not prevented, and not reported.**

- Rooms with no door, or entered only through a WC or a kitchen (the reference house, A1, the probe).
- Furniture overlap, mostly at corners between perpendicular walls (A3, A5, H1, H2, the reference house).
- Furniture inside door swings, and doors swinging into each other (5 agent runs and the reference house).
- Doors that swing the wrong way for the room (R1 before its render).
- Windows on internal walls, and windowless kitchens (A5).
- Missing fixtures, and fixtures in the wrong room (A3, the probe).
- Doors spanning two neighbouring rooms, for which the resolver silently skipped the mirrored door.

**Outside what syntax can solve.** These need declared intent to check against, or a critic. Tighter grammar will not fix them.

- **Circulation efficiency.** Six plans spent 19–23% on halls. A valid plan can be all corridor.
- **The room program.** A5 made Bed4 17.9 m² and the main bedroom 12.1 m². H2 made three rooms identical.
- **Zoning and daylight.** Day and night zones, which way the terrace faces, which rooms get the south light.
- **Furniture logic.** A sofa facing the TV, a bed with a free side, a desk with room for a chair.
- **Accessibility.** A6 could not state or verify a 1.5 m turning circle.

**Spec gaps nearly every agent hit.**

- **Furniture default sizes** were in `defaults.ts` but not in `spec`. 10 of 11 agents mentioned it, and A3 left out the cooker and fridge because of it.
- **What `check` verifies.** All 11 raised it, either assuming overlaps and swings were unchecked or unable to tell.
- **The MERGE model.** R1 and R2 modelled the parent as a bounding box and hit five `ROOM_OVERLAP` errors. H1 avoided `MERGE` for the same reason.
- **Where `OFFSET` starts** (the grid line or the inner wall face), and whether `OPENING` is mirrored. Most agents guessed within about 50 mm.
- **Missing types.** There was no wardrobe, washer or dishwasher, so `CABINET` stood in for all of them.

**Diagnostics and the render loop.** The diagnostics that did fire were good enough: they named the item, the wall and the offset, and every error was fixed in the next edit. `FURNITURE_OUTSIDE_WALL` did not state the usable wall length, and `ROOM_OVERLAP` between a merge parent and its child did not explain the merge model. The real limit was coverage, not wording.

The render loop caught things rules state poorly: R1's inverted doors, a sofa not facing the TV, a dark corridor. It still shipped defects the audit catches (R2's colliding doors, R5's wardrobe in a door swing), and it took about 1.2 to 1.7 times as long. Three caveats: the 0.2 renderer drew a door leaf but no swing arc; agents cannot view SVG, so they rasterised it with ImageMagick, which dropped every furniture outline; and there were only three such runs. Rendering complements rule checks; it cannot replace them.

The three wall thicknesses worked invisibly. `INFER` existed for generated source, but no agent needed it for authoring, and agents never saw computed areas unless they ran `describe` (one did).

## Recommendations, ranked by expected impact

1. **Relational warnings in `check`, with geometry and a suggested fix.** Warn about rooms unreachable from an exterior door, furniture overlap, furniture inside a door swing or its approach, colliding door swings, windows on internal walls, doors spanning two neighbours, and enclosed cells that belong to no room. Print "valid, N warnings", emit them in `--json`, and add `--strict` for pipelines that should fail on them. On this sample these rules flag 13 defects in 8 plans and 10 in the reference house, all from data the resolver already produces. Put numbers in every message (the free range on the wall, the depth left, the nearest legal offset), and print a room table with net areas and the circulation share.

   ```text
   reference-house.plandl:8:1   warning UNREACHABLE_ROOM   Laundry has no door or opening. Neighbours: Wardrobe (S), Hall (E), WC (E), Shower (N).
   reference-house.plandl:40:1  warning FURNITURE_OVERLAP  CABINET on Living_WEST overlaps FRIDGE on Kitchen_WEST by 0.40 m².
   reference-house.plandl:47:1  warning DOOR_SWING_BLOCKED BATHTUB (depth 800) is inside the 800 mm swing of the door on BathroomNorth_SOUTH; room depth is 1525 mm.
   reference-house.plandl: valid, 3 warnings
   ```

2. **Close the spec gaps.** Give standard furniture sizes, a "what check verifies" section, the merge model with an L-shaped example, the numeric `OFFSET` origin, whether `OPENING` is mirrored, and a rule of thumb: declare a door from the room it opens into. Add wardrobe, washer and dishwasher types.

3. **Declare doors as connections between two rooms.** With `DOOR BETWEEN=[Hall,Bed1] WIDTH=800mm`, the compiler finds the shared wall, rejects rooms that are not adjacent, places the leaf, and swings it into the room that is not circulation. The access graph is then written in the source, which removes R1's inverted doors and the reference house's bedroom-through-WC door.

4. **Optional room types that drive rules.** `ROOM NAME=Bed2 TYPE=BEDROOM` turns heuristics into rules: minimum sizes, required fixtures, external windows for habitable rooms, no wet rooms entered from a kitchen, no bedrooms as through-routes, doors swinging into rooms rather than corridors, and a measured circulation share.

5. **Program first, as assertions rather than a solver.** Let the agent state the brief as checkable intent (`REQUIRE ACCESS Bed2 FROM=Hall`, `REQUIRE AREA Kitchen MIN=7sqm`, `REQUIRE CIRCULATION MAX=15%`) and have `check` verify the geometry against it. A layout solver would be a different and expensive product, and agents already place rectangles fine. What they cannot do is verify relations.

6. **A render made for agents.** Add PNG output, door swing arcs, stronger furniture outlines with labels, and an overlay of warnings like the redlines on this page.

7. **Keep the grid, and steer agents toward finer grids.** Off-grid geometry would bring back the errors the grid removed. The problem is that coarse grids are the path of least resistance. Add spec guidance and an example with a finer grid, and let the circulation share show what a corridor band costs.

## Afterword: what should the compiler infer?

After reading the review, the follow-up question was whether compiler inference could fix the plans, and what the compiler would need to infer.

In 0.2, `INFER` was a one-way annotation that nothing produced and nothing read. The resolver never compared source values after `INFER` with what it computed, and no command wrote them back. A5 was the only agent that used it: it wrote `INFER OUTER_AREA=150sqm`, while the real figure was 204.13 m² (14.9 × 13.7 m including the terrace row and outer walls). The agent's picture of its own plan was off by 36%, and `check` printed "valid".

Of the 13 hard defects in agent plans, 10 were local placement problems that inference can prevent by filling in values agents are bad at. Two were about which rooms connect, which the compiler can detect and suggest but should not decide. One was about the room program, which inference can only report. That suggested three jobs for `INFER`:

1. **Write facts back into the source,** next to the line they describe, so the agent reads them in its own language rather than in JSON: `AREA`, usable wall lengths, `ACCESS`, `CONNECTS` and `SWINGS_INTO` for doors, default `DEPTH` for furniture, and the circulation share on the grid.
2. **Check values the agent writes after `INFER`, as claims.** A mismatch ("you wrote AREA=12sqm, computed 10.54sqm") points to exactly where the agent's picture of the plan went wrong. This differs from a requirement: a mismatch means the agent misjudged its own plan, while a failed requirement means the plan misses the brief.
3. **Fill in what agents are bad at, and write the choice back.** Make `OFFSET`, `HINGE` and `OPENING` optional for `BETWEEN` doors, choose them one wall at a time without overriding explicit values, and write the result after `INFER`, so the next edit starts from fixed values. Room rectangles, connections and sizes stay with the agent; inferring those would be the solver the review advised against.

## What came of it

PlanDL 0.4 shipped the same day. It took up recommendations 1 to 4, the first two jobs for `INFER`, and the door swing arcs from recommendation 6:

- `check` reports planning warnings with numbers, prints a room table with the circulation share, and fails on warnings with `--strict`. See [Checks](../../docs/checks/).
- Rooms take an optional `TYPE`, and `DOOR BETWEEN=[A,B]` finds the shared wall and swings into the second space.
- `plandl infer` writes computed facts back after `INFER`, and `check` reports `INFER_MISMATCH` when a written value disagrees.
- The spec lists standard furniture depths and typical widths, and adds `WARDROBE`, `WASHER` and `DISHWASHER`.
- The reference house was fixed, and every example must now pass `check --strict` to build.

Requirement assertions (recommendation 5), PNG output, and spec guidance toward finer grids are still open.

## Appendix: all eleven agent plans

{{< review-sheet src="h1.svg" alt="H1 plan" caption="H1 · 2-bed flat · Haiku" >}}
The sofa overlaps the dining table, and the entrance hall is a 13 m² dead-end corridor.
{{< /review-sheet >}}

{{< review-sheet src="r1.svg" alt="R1 plan" caption="R1 · 2-bed flat · Sonnet with render loop" >}}
Clean by audit after two renders. The 9.5 m hall corridor takes 11.6 m².
{{< /review-sheet >}}

{{< review-sheet src="a2.svg" alt="A2 plan" caption="A2 · 3-bed house · Sonnet" >}}
Clean by audit. Hall and corridor take 20% of the plan, and the bathroom and en-suite are the same 8 m².
{{< /review-sheet >}}

{{< review-sheet src="r2.svg" alt="R2 plan" caption="R2 · 3-bed house · Sonnet with render loop" >}}
The master bedroom and en-suite doors collide. Two corridors and a hall take 28 m².
{{< /review-sheet >}}

{{< review-sheet src="a5.svg" alt="A5 plan" caption="A5 · 4-bed house · Sonnet" >}}
The kitchen is an internal room with no window, and the toilet touches the basin in the WC.
{{< /review-sheet >}}

{{< review-sheet src="r5.svg" alt="R5 plan" caption="R5 · 4-bed house · Sonnet with render loop" >}}
A wardrobe stands in the swing of Bed4's door, and the dining table blocks two openings. The corridor takes 17 m².
{{< /review-sheet >}}

{{< review-sheet src="a4.svg" alt="A4 plan" caption="A4 · 1-bed flat · Sonnet" >}}
Clean by audit, though the kitchen and bathroom are tight.
{{< /review-sheet >}}

{{< review-sheet src="a6.svg" alt="A6 plan" caption="A6 · accessible 2-bed flat · Sonnet" >}}
A full-width 17 m² hall, and the living-room doors collide.
{{< /review-sheet >}}

A1, A3 and H2 are shown larger above.
