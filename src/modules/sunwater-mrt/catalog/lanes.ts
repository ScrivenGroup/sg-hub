export type FrequencyUnit = "year" | "month" | "week";

export type CatalogLane = {
  code: string;
  label: string;
  color: string;
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
  dueMonth: number;
  defLead: number;
};

export const AI_LEGACY_GREEN = "#4b8f3b";
export const AI_COLOR = "#3d6ea8";

export const CATALOG_LANES: CatalogLane[] = [
  {
    code: "AI",
    label: "Annual Inspection",
    color: AI_COLOR,
    frequencyCount: 1,
    frequencyUnit: "year",
    dueMonth: 6,
    defLead: 2,
  },
  {
    code: "CI",
    label: "Comprehensive Inspection",
    color: "#e07b1e",
    frequencyCount: 5,
    frequencyUnit: "year",
    dueMonth: 6,
    defLead: 4,
  },
  {
    code: "DS",
    label: "Dam Safety Review",
    color: "#c0392b",
    frequencyCount: 20,
    frequencyUnit: "year",
    dueMonth: 6,
    defLead: 9,
  },
];
