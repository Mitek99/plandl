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
  BATHTUB: 800,
  WARDROBE: 600,
  WASHER: 600,
  DISHWASHER: 600
});

/** Typical widths along the wall, published in the spec so authors do not have to guess. */
export const FURNITURE_TYPICAL_WIDTHS: Readonly<Record<FurnitureType, string>> = Object.freeze({
  BED: "900mm single, 1400-1800mm double",
  DESK: "1200-1600mm; WIDTH x DEPTH is the desktop, a chair is drawn in front of it, so keep about 600mm clear there",
  CABINET: "any; kitchen base units 600mm each",
  SINK: "600-1000mm",
  FRIDGE: "600-700mm",
  OVEN: "600mm",
  SOFA: "1800-2600mm",
  TABLE: "1200-1800mm; WIDTH x DEPTH is the tabletop, chairs are drawn around it, so keep about 600mm clear on each side",
  ISLAND: "1200-2000mm",
  TOILET: "400-600mm",
  SHOWER: "800-1000mm",
  BATHTUB: "1500-1800mm",
  WARDROBE: "1000-2400mm",
  WASHER: "600mm",
  DISHWASHER: "450-600mm"
});
