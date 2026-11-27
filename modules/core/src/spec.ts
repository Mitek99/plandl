export const PLANDL_SPEC = `PlanDL 0.3

PlanDL is a line-oriented DSL for rectangular grid-based floor plans.

LEXICAL RULES
- One definition per line. Blank lines and lines starting with # are ignored.
- Every line starts with an uppercase command followed by space-separated parameters.
- Parameters are KEY=value or the INFER modifier. Values are strings, scalars, or arrays.
- Strings may be bare words or double-quoted strings. Arrays use commas: [one,two].
- Lengths accept mm, cm, and m suffixes. Unitless lengths are millimetres.
- Areas accept sqm. Grid indices are unitless integers.
- A leading + or - is only allowed in GRID LINES_X and LINES_Y.

DEFINITIONS
GRID LINES_X=[line,...] LINES_Y=[line,...] [INFER OUTER_DIMENSIONS=[length,length] OUTER_AREA=area PERIMETER=length]
ROOM NAME=name X=[start_index,end_index] Y=[start_index,end_index] [MERGE=[name,...]] [INFER INNER_DIMENSIONS=[length,length] AREA=area]
TERRACE NAME=name X=[start_index,end_index] Y=[start_index,end_index] [MERGE=[name,...]] [INFER INNER_DIMENSIONS=[length,length] AREA=area]
DEFAULT [INNER_THICKNESS=length] [BEARING_THICKNESS=length] [OUTER_THICKNESS=length]
BEARING [X=[grid_index,...]] [Y=[grid_index,...]]
BED|DESK|CABINET|SINK|FRIDGE|OVEN|SOFA|TABLE|ISLAND|TOILET|SHOWER|BATHTUB WALL=RoomName_SIDE OFFSET=length [PADDING=length] WIDTH=length [DEPTH=length]
WINDOW WALL=RoomName_SIDE OFFSET=length WIDTH=length
DOOR WALL=RoomName_SIDE OFFSET=length WIDTH=length [HINGE=LEFT|RIGHT] [OPENING=INWARD|OUTWARD]
OPENING WALL=RoomName_SIDE OFFSET=length WIDTH=length
[INFER] WINDOW|DOOR|OPENING ...

GRID AND ROOMS
- GRID is the first and only grid definition. There is always a grid line at 0; LINES_X and LINES_Y list the lines after it.
- Each line is absolute (3m), +X from the previous line (+3m), or -X back from the next line (-3m).
- These are equivalent: [3m,6m,9m,12m], [+3m,+3m,+3m,+3m], [3m,+3m,-3m,12m]. Each gives lines at 0, 3, 6, 9 and 12m.
- A -X line needs a next line that is absolute or another -X line. Lines must strictly increase, so 0 is never listed.
- ROOM and TERRACE bounds are grid-line index ranges. Walls cannot be off-grid.
- The Y axis points north. Room and terrace names are unique.
- MERGE creates a compound space. Rooms merge only rooms and terraces merge only terraces.
- A space can be merged by only one parent. Unknown merges and merge cycles are invalid.
- Distinct spaces cannot overlap.

WALLS
- INNER_THICKNESS defaults to 100mm, BEARING_THICKNESS to 250mm, and OUTER_THICKNESS to 400mm.
- BEARING marks complete vertical X or horizontal Y grid lines as bearing.
- Inner and bearing walls are centered on their grid lines.
- An outer wall extends half the inner thickness inside, or half the bearing thickness on a bearing line.
- The rest of OUTER_THICKNESS extends outside. Thus a default non-bearing outer wall is 50mm inside and 350mm outside.
- Walls between components of one compound space are omitted. Terrace outer walls have zero thickness.

INFERENCE
- INFER marks all following properties as compiler-derived. Source inference values are advisory; normalized output always uses recomputed values.
- Grid outer dimensions include exterior thickness outside the outermost grid lines, including bearing-line adjustments.
- Room inner dimensions subtract the applicable inside wall thickness. AREA is in square millimetres in resolved JSON.
- Compound parents have aggregate AREA and no single INNER_DIMENSIONS value.

FURNITURE
- SIDE is NORTH, SOUTH, EAST, or WEST. OFFSET runs along the inner wall face from its lowest X or Y coordinate.
- PADDING is the gap from the inner wall face. WIDTH runs along the wall and DEPTH extends into the room.
- DEPTH is optional and uses the furniture type's standard depth.
- Furniture must fit within one wall segment and within the room perpendicular to that wall.

WINDOWS, DOORS, AND OPENINGS
- OFFSET and WIDTH use the same inner wall coordinates as furniture. Openings must fit on the selected wall.
- DOOR HINGE is LEFT or RIGHT as seen from inside the named room and defaults to LEFT.
- DOOR OPENING is INWARD or OUTWARD relative to the named room and defaults to INWARD.
- A DOOR on an inner wall generates an inferred DOOR for the adjoining room with the opposite side, mirrored HINGE and OPENING values, and a recomputed OFFSET.
- Leading INFER marks a complete compiler-generated opening definition. Inferred openings do not generate another counterpart.
- Resolved JSON includes explicit and inferred openings with centerline geometry and an inferred flag.

COMMANDS
plandl check <file> [--json]
plandl compile <file> [--output file.svg]
plandl describe <file>
plandl defaults [--json]
plandl spec
`;
