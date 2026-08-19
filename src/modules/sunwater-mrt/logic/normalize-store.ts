import { AI_COLOR, AI_LEGACY_GREEN } from "../catalog/lanes";
import type { ScheduleStore, ScheduledDetail } from "../schema";
import { laneTemplateWeekWindow } from "./assignment";
import { fyStartYm, monthIndex, todayYm } from "./dates";
import { prepareInspectReportPlan } from "./default-plan";
import { parseSchedKey, schedKey } from "./scheduling";

const DEFAULT_OWNERS: Record<string, string> = {
  Lead: "Brendan",
  Engineer: "Lucas",
  Support: "Bill",
};

function shiftScheduledIndices(store: ScheduleStore, delta: number) {
  if (!delta) return;
  const moved: Record<string, ScheduledDetail> = {};
  for (const [key, sd] of Object.entries(store.scheduledDetails)) {
    const parsed = parseSchedKey(key);
    if (!parsed) {
      moved[key] = sd;
      continue;
    }
    const nextSd = { ...sd };
    if (nextSd.dueIdxOverride !== undefined) {
      nextSd.dueIdxOverride += delta;
    }
    moved[schedKey(parsed.damId, parsed.laneCode, parsed.dueIdx + delta)] =
      nextSd;
  }
  store.scheduledDetails = moved;
}

export function normalizeScheduleStore(store: ScheduleStore): {
  store: ScheduleStore;
  changed: boolean;
} {
  const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
  let changed = false;

  for (const lane of next.lanes) {
    if (
      lane.code === "AI" &&
      lane.color.toLowerCase() === AI_LEGACY_GREEN.toLowerCase()
    ) {
      lane.color = AI_COLOR;
      changed = true;
    }
  }

  if (!next.damOwnership) next.damOwnership = {};
  for (const [role, name] of Object.entries(DEFAULT_OWNERS)) {
    if (!next.damOwnership[role]) next.damOwnership[role] = {};
    if (!next.damOwnership[role].ALL) {
      next.damOwnership[role].ALL = name;
      changed = true;
    }
  }

  if (!next.defaultPlansByLane) next.defaultPlansByLane = {};
  for (const lane of next.lanes) {
    const existing = next.defaultPlansByLane[lane.code];
    if (!existing || !existing.tasks?.length) {
      const weeks = laneTemplateWeekWindow(next, lane.code);
      next.defaultPlansByLane[lane.code] = prepareInspectReportPlan(
        weeks.length,
      );
      changed = true;
    }
  }

  if (next.openNotes === undefined) {
    next.openNotes = "";
    changed = true;
  }

  const desiredEpoch = fyStartYm();
  const previous = next.indexEpoch;
  const oldOrigin = previous?.y && previous?.m ? previous : todayYm();
  const delta = monthIndex(oldOrigin.y, oldOrigin.m, desiredEpoch);
  if (
    !previous ||
    previous.y !== desiredEpoch.y ||
    previous.m !== desiredEpoch.m
  ) {
    shiftScheduledIndices(next, delta);
    next.indexEpoch = desiredEpoch;
    changed = true;
  }

  return { store: next, changed };
}
