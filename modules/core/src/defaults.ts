export interface DefaultDefinition {
  name: string;
  value: number;
  unit: "mm";
  description: string;
}

export const DEFAULT_DEFINITIONS: readonly DefaultDefinition[] = [
  { name: "default_external_thickness", value: 400, unit: "mm", description: "External wall thickness" },
  { name: "default_internal_thickness", value: 100, unit: "mm", description: "Internal wall thickness" },
  { name: "default_terrace_thickness", value: 50, unit: "mm", description: "Terrace guardrail thickness" },
  { name: "default_wall_height", value: 2700, unit: "mm", description: "External and internal wall height" },
  { name: "default_terrace_height", value: 1100, unit: "mm", description: "Terrace guardrail height" },
  { name: "default_internal_door_width", value: 700, unit: "mm", description: "Internal door width" },
  { name: "default_external_door_width", value: 800, unit: "mm", description: "External door width" },
  { name: "default_door_height", value: 2100, unit: "mm", description: "Door height" },
  { name: "default_window_height", value: 1500, unit: "mm", description: "Window height" },
  { name: "default_window_sill_height", value: 900, unit: "mm", description: "Window sill height above finished floor" },
  { name: "default_opening_height", value: 2100, unit: "mm", description: "Cased opening height" },
  { name: "default_kitchen_counter_depth", value: 650, unit: "mm", description: "Kitchen counter depth" }
] as const;

export const DEFAULTS: Readonly<Record<string, number>> = Object.freeze(
  Object.fromEntries(DEFAULT_DEFINITIONS.map((entry) => [entry.name, entry.value]))
);
