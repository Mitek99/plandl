export const PLANDL_SPEC = `PlanDL 0.1

PlanDL is a small, line-oriented DSL for relative spatial plans. It is not a BIM format.

LEXICAL RULES
- One definition per line. Blank lines and lines starting with # are ignored.
- Reserved words are uppercase. IDs use lowercase letters, digits, and underscores.
- Names and descriptions are double-quoted strings.
- Lengths accept mm, cm, and m suffixes. Unitless numbers are millimetres.
- Directions are degrees clockwise from up: 0 up, 90 right, 180 down, 270 left.
- LEFT and RIGHT are relative to looking from wall start toward wall end.

DEFINITIONS
LET id = expression
WALL <EXTERNAL|INTERNAL|VIRTUAL|TERRACE> id "name" [START anchor] [THICKNESS length] [HEIGHT length] DIRECTION degrees LENGTH length
ROOM id "name" WALLS [wall_id, ...]
DOOR <INTERNAL|EXTERNAL> id "name" [ON wall_id] OFFSET length [WIDTH length] [HEIGHT length] SIDE <LEFT|RIGHT> OPENING_TYPE type
WINDOW id "name" [ON wall_id] OFFSET length WIDTH length [HEIGHT length] [SILL_HEIGHT length] SIDE <LEFT|RIGHT>
OPENING id "name" [ON wall_id] OFFSET length WIDTH length [HEIGHT length] SIDE <LEFT|RIGHT> OPENING_TYPE type
OBJECT id "name" KIND kind [ON wall_id] OFFSET length SIDE <LEFT|RIGHT> [GAP length] SIZE along X depth

ANCHORS
START wall_id.start
START wall_id.end
START wall_id.at(offset)

SEMANTICS
- The first wall starts at an implicit origin. Absolute coordinates are not part of PlanDL.
- Every later wall must reference an earlier wall. Forward references and dependency cycles are invalid.
- Variables are sequential. Built-in default_ variables are read-only.
- Wall lengths and attached offsets use the directed reference face. Opening offsets target the leading edge.
- Omitting ON uses the closest preceding WALL definition.
- T-junctions split walls internally. Rooms may use different subsegments of one source wall.
- A room's wall references must select exactly one closed, non-self-intersecting boundary.
- Walls must not cross or overlap.
- VIRTUAL walls are zero-thickness, zero-height, fully open logical boundaries.
- TERRACE walls represent guardrails.
- The left face is the reference face; physical wall thickness extends to its right.

COMMANDS
plandl check <file> [--json]
plandl compile <file> [--output file.svg]
plandl describe <file>
plandl defaults [--json]
plandl spec
`;
