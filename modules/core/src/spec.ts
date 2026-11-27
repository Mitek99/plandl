import { CIRCULATION_LIMIT, HABITABLE_TYPES, MINIMUM_SIZES, REQUIRED_FIXTURES, WARNING_CODES } from "./analyze.js";
import { FURNITURE_DEPTHS, FURNITURE_TYPICAL_WIDTHS } from "./defaults.js";
import { FURNITURE_TYPES, ROOM_TYPES } from "./types.js";

// The compact specification printed by `plandl spec`. The furniture table, room-type rules and
// warning list are generated from the same constants the checker uses, so they cannot drift.

const furnitureTable = FURNITURE_TYPES
  .map((type) => `  ${type.padEnd(11)} depth ${String(FURNITURE_DEPTHS[type]).padStart(4)}mm  width ${FURNITURE_TYPICAL_WIDTHS[type]}`)
  .join("\n");

const roomRules = ROOM_TYPES.map((type) => {
  const rules: string[] = [];
  if (HABITABLE_TYPES.includes(type)) rules.push("needs a window in an outer wall");
  const fixtures = REQUIRED_FIXTURES[type];
  if (fixtures) rules.push(`needs ${fixtures.map((options) => options.length > 1 ? `(${options.join(" or ")})` : options[0]).join(" and ")}`);
  const minimum = MINIMUM_SIZES[type];
  if (minimum) {
    const parts = [minimum.area > 0 ? `${minimum.area / 1e6}sqm` : "", `${minimum.width / 1000}m wide`].filter(Boolean);
    rules.push(`at least ${parts.join(" and ")}`);
  }
  if (type === "CIRCULATION") rules.push(`counts toward the circulation share (warning above ${Math.round(CIRCULATION_LIMIT * 100)}%)`);
  return `  ${type.padEnd(12)} ${rules.length > 0 ? rules.join("; ") : "no extra rules"}`;
}).join("\n");

const warningList = Object.entries(WARNING_CODES).map(([code, description]) => `  ${code.padEnd(23)} ${description}`).join("\n");

export const PLANDL_SPEC = `PlanDL 0.4

PlanDL is a line-oriented DSL for rectangular grid-based floor plans. Write a plan, run
plandl check, fix what it reports, and repeat until it reports no warnings.

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
ROOM NAME=name [TYPE=type] X=[start_index,end_index] Y=[start_index,end_index] [MERGE=[name,...]] [INFER INNER_DIMENSIONS=[length,length] AREA=area ACCESS=[name,...]]
TERRACE NAME=name X=[start_index,end_index] Y=[start_index,end_index] [MERGE=[name,...]] [INFER ...]
DEFAULT [INNER_THICKNESS=length] [BEARING_THICKNESS=length] [OUTER_THICKNESS=length]
BEARING [X=[grid_index,...]] [Y=[grid_index,...]]
<FURNITURE> WALL=RoomName_SIDE OFFSET=length [PADDING=length] WIDTH=length [DEPTH=length]
WINDOW WALL=RoomName_SIDE OFFSET=length WIDTH=length
DOOR BETWEEN=[from,into] WIDTH=length [SIDE=NORTH|SOUTH|EAST|WEST] [AT=START|CENTER|END] [HINGE=LEFT|RIGHT] [OPENING=INWARD|OUTWARD]
DOOR WALL=RoomName_SIDE OFFSET=length WIDTH=length [HINGE=LEFT|RIGHT] [OPENING=INWARD|OUTWARD]
OPENING BETWEEN=[a,b] WIDTH=length [SIDE=NORTH|SOUTH|EAST|WEST] [AT=START|CENTER|END]
OPENING WALL=RoomName_SIDE OFFSET=length WIDTH=length

GRID AND ROOMS
- GRID is the first and only grid definition. There is always a grid line at 0; LINES_X and LINES_Y list the lines after it.
- Each line is absolute (3m), +X from the previous line (+3m), or -X back from the next line (-3m).
- These are equivalent: [3m,6m,9m,12m], [+3m,+3m,+3m,+3m], [3m,+3m,-3m,12m]. Each gives lines at 0, 3, 6, 9 and 12m.
- A -X line needs a next line that is absolute or another -X line. Lines must strictly increase, so 0 is never listed.
- ROOM and TERRACE bounds are grid-line index ranges. Walls lie only on grid lines. The Y axis points north.
- Add a grid line wherever a wall should start or stop. A room can span several cells. A coarse grid forces every
  room in a row to the same depth; a finer grid lets each room have the size the brief asks for.
- Names are unique. Distinct spaces cannot overlap. Every cell inside the building should belong to a room.

COMPOUND SPACES (MERGE)
- Each member of a compound is its own non-overlapping rectangle. The parent lists its members in MERGE,
  and the walls between members are omitted. An L-shaped living room:
    GRID LINES_X=[3m,5m] LINES_Y=[3m,4.5m]
    ROOM NAME=Nook X=[1,2] Y=[1,2]
    ROOM NAME=Living TYPE=LIVING X=[0,2] Y=[0,1] MERGE=[Nook]
- Never draw the parent as a bounding box around its members: that is ROOM_OVERLAP.
- Rooms merge only rooms and terraces only terraces. A space has at most one parent; no cycles.
- A merged member keeps its own name for walls (Nook_NORTH) and can have its own TYPE (an open kitchen in a living room).

ROOM TYPES
TYPE is optional. Typed rooms get extra checks; untyped rooms get only geometric checks.
${roomRules}

WALLS
- INNER_THICKNESS defaults to 100mm, BEARING_THICKNESS to 250mm, and OUTER_THICKNESS to 400mm.
- BEARING marks complete vertical X or horizontal Y grid lines as bearing.
- Inner and bearing walls are centered on their grid lines.
- An outer wall extends half the inner thickness inside, or half the bearing thickness on a bearing line.
  The rest extends outside: a default outer wall is 50mm inside the grid line and 350mm outside.
- Terrace outer walls have zero thickness.

WALL COORDINATES
- RoomName_SIDE names one side of a room: NORTH, SOUTH, EAST, or WEST.
- OFFSET runs along the inner face of that wall from its lowest X or Y end, which is the inside corner, not the grid line.
  A room between grid lines X=0 and X=4m has its inner faces at X=50mm and X=3950mm, so its NORTH and SOUTH walls are
  3.9m long and OFFSET=0 is at X=50mm. The usable length of each wall is the room's INNER_DIMENSIONS.
- Things on perpendicular walls meet in the corner: a CABINET at OFFSET=0 on Kitchen_SOUTH and a FRIDGE at OFFSET=0 on
  Kitchen_WEST overlap unless one starts beyond the other's DEPTH.

DOORS, OPENINGS, AND WINDOWS
- Prefer DOOR BETWEEN=[Hall,Bed1]. The compiler finds the wall Hall and Bed1 share, places the door AT=START
  (default: 100mm from the corner at the low X or Y end of the shared stretch), CENTER, or END, hinges it on the
  corner side, and swings it into the second space (Bed1). List the hall first so doors open into rooms.
- OUTSIDE names the exterior: DOOR BETWEEN=[OUTSIDE,Hall] WIDTH=900mm is an entrance that swings into Hall.
- When the two spaces share more than one wall (always true for OUTSIDE), SIDE picks the side of the space the door
  opens into: DOOR BETWEEN=[OUTSIDE,Hall] SIDE=SOUTH WIDTH=900mm. Without SIDE the longest shared stretch is used.
- OPENING BETWEEN=[Kitchen,Dining] WIDTH=1.2m is a doorless opening on the shared wall.
- WALL form: HINGE is LEFT or RIGHT as seen from inside the named room (default LEFT). OPENING is INWARD or OUTWARD
  relative to the named room (default INWARD): an INWARD door on Hall_EAST swings into Hall.
- A door in an inner wall belongs to both rooms. Declare it once, from either side, never from both.
- Windows go in outer walls: walls to OUTSIDE or to a terrace.
- Doors and openings are what connect rooms. Every room needs one, and the plan needs a door to OUTSIDE.

FURNITURE
- PADDING is the gap from the inner wall face. WIDTH runs along the wall and DEPTH extends into the room.
- DEPTH is optional and uses the standard depth below. Furniture must fit on one wall segment and inside the room.
- Leave the floor a door leaf sweeps clear: a door of width W sweeps a quarter circle of radius W on the side it opens to.
- Types, standard depths, and typical widths:
${furnitureTable}

INFERENCE
- INFER marks all following properties on a line as compiler-derived facts.
- plandl infer rewrites the source with the computed facts after INFER: GRID OUTER_DIMENSIONS, OUTER_AREA, PERIMETER;
  ROOM INNER_DIMENSIONS, AREA, ACCESS (spaces reached through its doors and openings); DOOR and OPENING CONNECTS,
  SWINGS_INTO, and for BETWEEN also WALL, OFFSET, HINGE, OPENING; furniture DEPTH.
- check compares INFER values you write with the computed ones and warns INFER_MISMATCH. Writing your expectation,
  such as INFER AREA=12sqm on a bedroom, is a cheap way to catch a wrong mental picture of the plan.
- A line that starts with INFER (INFER DOOR ...) is a complete compiler-generated opening and adds no new door.

WHAT CHECK VERIFIES
Errors reject the plan: syntax, unknown names and walls, the grid, overlapping spaces, rooms with no interior,
furniture and openings that do not fit their wall or room, and BETWEEN spaces that share no wall or too little wall.
Warnings leave the plan valid but mark what an architect would redline:
${warningList}
check also prints a room table with type, inner size, area, access and windows, and the circulation share.
check --strict exits with an error when there are warnings.

COMMANDS
plandl check <file> [--json] [--strict] [--quiet]
plandl infer <file> [--write | -o file]
plandl compile <file> [--output file.svg] [--grid]
plandl describe <file>
plandl defaults [--json]
plandl spec

WORKFLOW
1. List the rooms the brief needs, with TYPE and a target area for each.
2. Choose grid lines so each room is a rectangle of cells; add lines where room sizes differ.
3. Connect the rooms with DOOR BETWEEN, starting with an entrance from OUTSIDE into a hall or living room.
4. Add windows on outer walls, then furniture away from door swings.
5. Run plandl check and fix every warning. Run plandl infer to read areas and access in the source.
`;
