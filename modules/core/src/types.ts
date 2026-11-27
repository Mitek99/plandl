export interface SourceLocation {
  line: number;
  column: number;
}

export interface Diagnostic {
  code: string;
  message: string;
  severity: "error" | "warning";
  location?: SourceLocation;
}

export type ScalarUnit = "mm" | "cm" | "m" | "sqm";

export interface Scalar {
  value: number;
  unit?: ScalarUnit;
  /** Explicit leading sign in source. A "-" scalar also has a negative value. */
  sign?: "+" | "-";
  raw: string;
  location: SourceLocation;
}

export type ParameterValue = string | Scalar | Array<string | Scalar>;
export type InferredProperties = Record<string, ParameterValue>;

interface DefinitionBase {
  location: SourceLocation;
}

export interface GridDefinition extends DefinitionBase {
  kind: "grid";
  /** Grid lines after the implicit line at 0: absolute (3m), from the previous line (+3m), or to the next line (-3m). */
  linesX: Scalar[];
  linesY: Scalar[];
  inferred: InferredProperties;
}

export interface RoomDefinition extends DefinitionBase {
  kind: "room" | "terrace";
  name: string;
  x: [Scalar, Scalar];
  y: [Scalar, Scalar];
  merge: string[];
  inferred: InferredProperties;
}

export interface DefaultDefinition extends DefinitionBase {
  kind: "default";
  innerThickness?: Scalar;
  bearingThickness?: Scalar;
  outerThickness?: Scalar;
}

export interface BearingDefinition extends DefinitionBase {
  kind: "bearing";
  x: Scalar[];
  y: Scalar[];
}

export const FURNITURE_TYPES = [
  "BED",
  "DESK",
  "CABINET",
  "SINK",
  "FRIDGE",
  "OVEN",
  "SOFA",
  "TABLE",
  "ISLAND",
  "TOILET",
  "SHOWER",
  "BATHTUB"
] as const;

export type FurnitureType = typeof FURNITURE_TYPES[number];
export type WallSide = "NORTH" | "SOUTH" | "EAST" | "WEST";

export interface FurnitureDefinition extends DefinitionBase {
  kind: "furniture";
  furnitureType: FurnitureType;
  wall: string;
  offset: Scalar;
  padding?: Scalar;
  width: Scalar;
  depth?: Scalar;
}

export type OpeningCommand = "WINDOW" | "DOOR" | "OPENING";
export type DoorHinge = "LEFT" | "RIGHT";
export type DoorSwing = "INWARD" | "OUTWARD";

export interface OpeningDefinition extends DefinitionBase {
  kind: "opening";
  openingType: OpeningCommand;
  wall: string;
  offset: Scalar;
  width: Scalar;
  hinge?: DoorHinge;
  swing?: DoorSwing;
  isInferred: boolean;
}

export type Definition =
  | GridDefinition
  | RoomDefinition
  | DefaultDefinition
  | BearingDefinition
  | FurnitureDefinition
  | OpeningDefinition;

export interface PlanDocument {
  definitions: Definition[];
}

export interface Point {
  x: number;
  y: number;
}

export interface WallDefaults {
  innerThickness: number;
  bearingThickness: number;
  outerThickness: number;
}

export interface ResolvedGrid {
  x: number[];
  y: number[];
  outerDimensions: [number, number];
  outerArea: number;
  perimeter: number;
  location: SourceLocation;
}

export interface ResolvedRoom {
  name: string;
  type: "ROOM" | "TERRACE";
  x: [number, number];
  y: [number, number];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  merge: string[];
  compound: string;
  innerDimensions?: [number, number];
  area: number;
  location: SourceLocation;
}

export interface ResolvedWall {
  start: Point;
  end: Point;
  type: "INNER" | "OUTER" | "TERRACE";
  bearing: boolean;
  thickness: number;
  inside: number;
  outside: number;
  interiorSide?: "LEFT" | "RIGHT";
  rooms: string[];
}

export interface ResolvedFurniture {
  type: FurnitureType;
  wall: string;
  room: string;
  side: WallSide;
  offset: number;
  padding: number;
  width: number;
  depth: number;
  footprint: Point[];
  location: SourceLocation;
}

export interface ResolvedOpening {
  type: OpeningCommand;
  wall: string;
  room: string;
  component: string;
  side: WallSide;
  offset: number;
  width: number;
  hinge?: DoorHinge;
  swing?: DoorSwing;
  start: Point;
  end: Point;
  wallThickness: number;
  inferred: boolean;
  inferredFrom?: string;
  location: SourceLocation;
}

export interface ResolvedPlan {
  grid?: ResolvedGrid;
  defaults: WallDefaults;
  rooms: ResolvedRoom[];
  terraces: ResolvedRoom[];
  walls: ResolvedWall[];
  furniture: ResolvedFurniture[];
  openings: ResolvedOpening[];
  diagnostics: Diagnostic[];
}

export interface ParseResult {
  document: PlanDocument;
  diagnostics: Diagnostic[];
}
