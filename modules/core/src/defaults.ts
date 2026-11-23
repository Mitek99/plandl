import type { FurnitureType, WallDefaults } from "./types.js";

export interface DefaultEntry {
  name: "INNER_THICKNESS" | "BEARING_THICKNESS" | "OUTER_THICKNESS";
  value: number;
  unit: "mm";
  description: string;
}

export const DEFAULT_DEFINITIONS: readonly DefaultEntry[] = [
  { name: "INNER_THICKNESS", value: 100, unit: "mm", description: "Inner wall thickness" },
  { name: "BEARING_THICKNESS", value: 250, unit: "mm", description: "Bearing wall thickness" },
  { name: "OUTER_THICKNESS", value: 400, unit: "mm", description: "Outer wall thickness" }
] as const;

export const DEFAULT_WALLS: Readonly<WallDefaults> = Object.freeze({
  innerThickness: 100,
  bearingThickness: 250,
  outerThickness: 400
});

export const FURNITURE_DEPTHS: Readonly<Record<FurnitureType, number>> = Object.freeze({
  BED: 2000,
  DESK: 600,
  CABINET: 600,
  SINK: 600,
  FRIDGE: 700,
  OVEN: 600,
  SOFA: 900,
  TABLE: 900,
  ISLAND: 900,
  TOILET: 700,
  SHOWER: 900,
  BATHTUB: 800
});
