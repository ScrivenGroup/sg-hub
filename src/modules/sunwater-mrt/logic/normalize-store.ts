import { AI_COLOR, AI_LEGACY_GREEN } from "../catalog/lanes";
import { defaultExternalRate, defaultInternalRateForRole, externalRateIsCustom } from "../catalog/roster";
import type { ScheduleStore, ScheduledDetail } from "../schema";
import { laneTemplateWeekWindow, seedPlanFromDefaults } from "./assignment";
import { fyStartYm, monthIndex, todayYm } from "./dates";
import { prepareInspectReportPlan, scalePlanHours } from "./default-plan";
import { laneApplies } from "./applicability";
import { nextDueInfo, parseSchedKey, schedKey } from "./scheduling";

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
      const scale = Math.max(0.35, Math.min(1.6, (lane.defLead || 2) / 4));
      next.defaultPlansByLane[lane.code] = scalePlanHours(
        prepareInspectReportPlan(weeks.length),
        scale,
      );
      changed = true;
    }
  }

  if (
    next.dams.length >= 20 &&
    Object.keys(next.scheduledDetails || {}).length === 0
  ) {
    for (const dam of next.dams) {
      for (const lane of next.lanes) {
        if (!laneApplies(next.laneApplicability, dam, lane)) continue;
        const info = nextDueInfo(next, dam, lane);
        if (!info) continue;
        const key = schedKey(dam.id, lane.code, Math.round(info.dueIdx));
        const weeks = laneTemplateWeekWindow(next, lane.code);
        next.scheduledDetails[key] = {
          plan: seedPlanFromDefaults(next, lane.code, weeks.length, dam.id),
          tailWeeks: weeks.length,
        };
      }
    }
    changed = true;
  }

  if (next.openNotes === undefined) {
    next.openNotes = "";
    changed = true;
  }

  if (
    next.externalRatePercent === undefined ||
    !Number.isFinite(next.externalRatePercent)
  ) {
    next.externalRatePercent = 150;
    changed = true;
  }

  for (const p of next.people) {
    if (!p.internalRate) {
      p.internalRate = defaultInternalRateForRole(p.role);
      if (
        !p.externalRate ||
        !externalRateIsCustom(
          p.internalRate,
          p.externalRate,
          next.externalRatePercent,
        )
      ) {
        p.externalRate = defaultExternalRate(
          p.internalRate,
          next.externalRatePercent,
        );
      }
      changed = true;
    }
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
