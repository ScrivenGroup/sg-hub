import type { Dam, ScheduleStore } from "../schema";
import { CATALOG_DAMS, type CatalogDam } from "./dams";
import { CATALOG_LANES } from "./lanes";

const PARADISE_ID = "1997";

/** Same rule as gantt-tool `laneApplies()`: OTH = Paradise only; AI = dam.ai; SR = has SR years. */
export function catalogLaneApplies(dam: CatalogDam, laneCode: string) {
  if (laneCode === "OTH") return dam.id === PARADISE_ID;
  if (laneCode === "AI") return dam.ai;
  if (laneCode === "SR") return dam.srStartYear != null;
  return true;
}

export function seedLaneApplicability(dams: Dam[] = CATALOG_DAMS) {
  const out: ScheduleStore["laneApplicability"] = {};
  for (const dam of dams) {
    const src = CATALOG_DAMS.find((d) => d.id === dam.id);
    out[dam.id] = {};
    for (const lane of CATALOG_LANES) {
      out[dam.id][lane.code] = src
        ? catalogLaneApplies(src, lane.code)
        : true;
    }
  }
  return out;
}

export function seedLaneCycleAnchors(dams: CatalogDam[] = CATALOG_DAMS) {
  const out: NonNullable<ScheduleStore["laneCycleAnchors"]> = {};
  for (const dam of dams) {
    const row: Record<string, { y: number; m: number }> = {};
    row.CI = { y: dam.ciStartYear, m: 6 };
    if (dam.srStartYear != null) row.SR = { y: dam.srStartYear, m: 6 };
    row.AI = { y: dam.ciStartYear, m: 6 };
    row.AS = { y: 2026, m: 10 };
    row.EAR = { y: 2026, m: 9 };
    row.APR = { y: 2026, m: 8 };
    row.UPR = { y: 2026, m: 10 };
    row.FIA = { y: 2027, m: 1 };
    row.EAPR = { y: 2027, m: 4 };
    row.FMM = { y: 2027, m: 7 };
    if (dam.id === PARADISE_ID) row.OTH = { y: 2020, m: 12 };
    out[dam.id] = row;
  }
  return out;
}
