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

/** 11 requirement types from milestone-master `gantt-tool/data/lanes.js`. */
export const CATALOG_LANES: CatalogLane[] = [
  {
    code: "SR",
    label: "Safety Review",
    color: "#c0392b",
    frequencyCount: 20,
    frequencyUnit: "year",
    dueMonth: 6,
    defLead: 9,
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
    code: "AI",
    label: "Annual Inspection",
    color: AI_COLOR,
    frequencyCount: 1,
    frequencyUnit: "year",
    dueMonth: 6,
    defLead: 2,
  },
  {
    code: "AS",
    label: "Annual Safety Statement",
    color: "#2f6fb0",
    frequencyCount: 1,
    frequencyUnit: "year",
    dueMonth: 10,
    defLead: 1,
  },
  {
    code: "EAR",
    label: "EAP Annual Review",
    color: "#7d5aa6",
    frequencyCount: 1,
    frequencyUnit: "year",
    dueMonth: 9,
    defLead: 1,
  },
  {
    code: "APR",
    label: "Annual Preparedness Report",
    color: "#1f9e88",
    frequencyCount: 1,
    frequencyUnit: "year",
    dueMonth: 8,
    defLead: 2,
  },
  {
    code: "UPR",
    label: "Upgrade Project Plan Report",
    color: "#c99a1a",
    frequencyCount: 1,
    frequencyUnit: "year",
    dueMonth: 10,
    defLead: 2,
  },
  {
    code: "FIA",
    label: "FIA reassessment",
    color: "#6b6f8a",
    frequencyCount: 40,
    frequencyUnit: "year",
    dueMonth: 1,
    defLead: 6,
  },
  {
    code: "EAPR",
    label: "EAP comprehensive renewal",
    color: "#b5507a",
    frequencyCount: 40,
    frequencyUnit: "year",
    dueMonth: 4,
    defLead: 3,
  },
  {
    code: "FMM",
    label: "Flood Mitigation Manual (initial/renewal)",
    color: "#8a6d3b",
    frequencyCount: 40,
    frequencyUnit: "year",
    dueMonth: 7,
    defLead: 6,
  },
  {
    code: "OTH",
    label: "Other dam-specific condition",
    color: "#8b1a1a",
    frequencyCount: 40,
    frequencyUnit: "year",
    dueMonth: 12,
    defLead: 0,
  },
];
