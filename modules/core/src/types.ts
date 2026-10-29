export type WallType = "EXTERNAL" | "INTERNAL" | "VIRTUAL" | "TERRACE";
export type DoorType = "INTERNAL" | "EXTERNAL";
export type Side = "LEFT" | "RIGHT";

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

export type Expression =
  | { kind: "number"; value: number }
  | { kind: "identifier"; name: string }
  | { kind: "unary"; operator: "+" | "-"; operand: Expression }
  | { kind: "binary"; operator: "+" | "-" | "*" | "/"; left: Expression; right: Expression };

export interface WallAnchor {
  wallId: string;
  point: "start" | "end" | "at";
  offset?: Expression;
}

interface DefinitionBase {
  id: string;
  name: string;
  location: SourceLocation;
}

export interface LetDefinition {
  kind: "let";
  id: string;
  expression: Expression;
  location: SourceLocation;
}

export interface WallDefinition extends DefinitionBase {
  kind: "wall";
  wallType: WallType;
  start?: WallAnchor;
  direction: Expression;
  length: Expression;
  thickness?: Expression;
  height?: Expression;
}

export interface RoomDefinition extends DefinitionBase {
  kind: "room";
  wallIds: string[];
}

interface AttachedDefinitionBase extends DefinitionBase {
  hostId?: string;
  offset: Expression;
  side: Side;
}

export interface DoorDefinition extends AttachedDefinitionBase {
  kind: "door";
  doorType: DoorType;
  width?: Expression;
  height?: Expression;
  openingType: string;
}

export interface WindowDefinition extends AttachedDefinitionBase {
  kind: "window";
  width: Expression;
  height?: Expression;
  sillHeight?: Expression;
}

export interface OpeningDefinition extends AttachedDefinitionBase {
  kind: "opening";
  width: Expression;
  height?: Expression;
  openingType: string;
}

export interface ObjectDefinition extends AttachedDefinitionBase {
  kind: "object";
  objectType: string;
  gap?: Expression;
  size?: [Expression, Expression];
}

export type Definition =
  | LetDefinition
  | WallDefinition
  | RoomDefinition
  | DoorDefinition
  | WindowDefinition
  | OpeningDefinition
  | ObjectDefinition;

export interface PlanDocument {
  definitions: Definition[];
}

export interface Point {
  x: number;
  y: number;
}

export interface ResolvedWall extends DefinitionBase {
  type: WallType;
  start: Point;
  end: Point;
  direction: number;
  length: number;
  thickness: number;
  height: number;
}

interface ResolvedAttachedBase extends DefinitionBase {
  hostId: string;
  offset: number;
  side: Side;
}

export interface ResolvedDoor extends ResolvedAttachedBase {
  type: DoorType;
  width: number;
  height: number;
  openingType: string;
}

export interface ResolvedWindow extends ResolvedAttachedBase {
  width: number;
  height: number;
  sillHeight: number;
}

export interface ResolvedOpening extends ResolvedAttachedBase {
  width: number;
  height: number;
  openingType: string;
}

export interface ResolvedObject extends ResolvedAttachedBase {
  objectType: string;
  gap: number;
  size: [number, number];
}

export interface ResolvedRoom extends DefinitionBase {
  wallIds: string[];
  boundary: Point[];
  area: number;
}

export interface ResolvedPlan {
  variables: Record<string, number>;
  walls: ResolvedWall[];
  rooms: ResolvedRoom[];
  doors: ResolvedDoor[];
  windows: ResolvedWindow[];
  openings: ResolvedOpening[];
  objects: ResolvedObject[];
  diagnostics: Diagnostic[];
}

export interface ParseResult {
  document: PlanDocument;
  diagnostics: Diagnostic[];
}
