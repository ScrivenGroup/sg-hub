export type LaneKind =
  | "cyclic-sr"
  | "cyclic-ci"
  | "annual-ai"
  | "annual-fixed"
  | "once"
  | "paradise";

export type CatalogLane = {
  code: string;
  label: string;
  color: string;
  defLead: number;
  assumed: boolean;
  kind: LaneKind;
  month?: number;
  once?: { y: number; m: number };
  source: string;
};

export const CATALOG_LANES: CatalogLane[] = [
  { code: "SR", label: "Safety Review", color: "#c0392b", defLead: 9, assumed: false, kind: "cyclic-sr", source: "Dam Safety Conditions Schedule, condition 9(a)" },
  { code: "CI", label: "Comprehensive Inspection", color: "#e07b1e", defLead: 4, assumed: false, kind: "cyclic-ci", source: "Dam Safety Conditions Schedule, condition 8(a)" },
  { code: "AI", label: "Annual Inspection", color: "#4b8f3b", defLead: 2, assumed: false, kind: "annual-ai", source: "WSSR Act 2008 Ch.4; Guideline 'Dam Safety Management' Table 1" },
  { code: "AS", label: "Annual Safety Statement", color: "#2f6fb0", defLead: 1, assumed: false, kind: "annual-fixed", month: 10, source: "WSSR Act 2008 Ch.4; Guideline 'Dam Safety Management' Table 1" },
  { code: "EAR", label: "EAP Annual Review", color: "#7d5aa6", defLead: 1, assumed: false, kind: "annual-fixed", month: 9, source: "WSSR Act 2008 Ch.4; Guideline 'Dam Safety Management' Table 1" },
  { code: "APR", label: "Annual Preparedness Report", color: "#1f9e88", defLead: 2, assumed: true, kind: "annual-fixed", month: 8, source: "WSSR Act 2008 s.375 (applicability assumed)" },
  { code: "UPR", label: "Upgrade Project Plan Report", color: "#c99a1a", defLead: 2, assumed: true, kind: "annual-fixed", month: 10, source: "WSSR Act 2008, alongside Annual Safety Statement (applicability assumed)" },
  { code: "FIA", label: "FIA reassessment", color: "#6b6f8a", defLead: 6, assumed: true, kind: "once", once: { y: 2027, m: 1 }, source: "WSSR Act 2008 s.350(2) (date assumed)" },
  { code: "EAPR", label: "EAP comprehensive renewal", color: "#b5507a", defLead: 3, assumed: true, kind: "once", once: { y: 2027, m: 4 }, source: "WSSR Act 2008 s.352K (date assumed)" },
  { code: "FMM", label: "Flood Mitigation Manual (initial/renewal)", color: "#8a6d3b", defLead: 6, assumed: true, kind: "once", once: { y: 2027, m: 7 }, source: "WSSR Act 2008 s.371A (applicability & date assumed)" },
  { code: "OTH", label: "Other dam-specific condition", color: "#8b1a1a", defLead: 0, assumed: true, kind: "paradise", source: "Paradise Dam Condition Schedule, Condition 11" },
];
