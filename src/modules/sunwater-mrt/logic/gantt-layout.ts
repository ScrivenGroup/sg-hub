import type { Dam, Lane, ScheduleStore } from "../schema";
import { laneApplies } from "./applicability";
import {
  earliestNextDue,
  isScheduled,
  nextDueChip,
  nextDueInfo,
  occurrenceStatus,
  pairHasActualised,
  type NextDueChip,
} from "./scheduling";

export type GroupMode = "dam-obl" | "obl-dam" | "flat";

export type GanttLayoutItem =
  | {
      type: "heading";
      key: string;
      text: string;
      collapsed: boolean;
      childCount: number;
      h: number;
      stripe: number;
      chip: NextDueChip | null;
      children: { damId: string; laneCode: string }[];
    }
  | {
      type: "row";
      key: string;
      damId: string;
      damName: string;
      laneCode: string;
      laneLabel: string;
      color: string;
      h: number;
      stripe: number;
      chip: NextDueChip | null;
    }
  | {
      type: "gap";
      key: string;
      h: number;
      stripe: number;
    };

export type LeafPair = {
  dam: Dam;
  lane: Lane;
  chip: NextDueChip | null;
};

function pairPassesStatus(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  onlyOngoing: boolean,
  scheduleFilter: null | "scheduled" | "predicted",
) {
  const info = nextDueInfo(store, dam, lane);
  if (!info) return false;
  const st = occurrenceStatus(store, dam, lane, Math.round(info.dueIdx));
  if (onlyOngoing && st.status !== "ongoing" && st.status !== "overdue") {
    return false;
  }
  const scheduled = isScheduled(store, dam, lane, Math.round(info.dueIdx));
  if (scheduleFilter === "scheduled" && !scheduled) return false;
  if (scheduleFilter === "predicted" && scheduled) return false;
  return true;
}

export function visiblePairs(
  store: ScheduleStore,
  damFilter: string[],
  laneFilter: string[],
  onlyOngoing: boolean,
  scheduleFilter: null | "scheduled" | "predicted",
): LeafPair[] {
  const dams =
    damFilter.length === 0
      ? store.dams
      : store.dams.filter((d) => damFilter.includes(d.id));
  const lanes =
    laneFilter.length === 0
      ? store.lanes
      : store.lanes.filter((l) => laneFilter.includes(l.code));
  const out: LeafPair[] = [];
  for (const dam of dams) {
    for (const lane of lanes) {
      const applies = laneApplies(store.laneApplicability, dam, lane);
      if (!applies && !pairHasActualised(store, dam.id, lane.code)) continue;
      if (!pairPassesStatus(store, dam, lane, onlyOngoing, scheduleFilter)) {
        continue;
      }
      out.push({ dam, lane, chip: nextDueChip(store, dam, lane) });
    }
  }
  return out;
}

export function buildGanttLayout(
  pairs: LeafPair[],
  mode: GroupMode,
  collapsed: Record<string, boolean>,
  headingH: number,
  laneH: number,
  gap: number,
): { items: GanttLayoutItem[]; totalHeight: number } {
  const items: GanttLayoutItem[] = [];
  let y = 0;

  if (mode === "flat") {
    pairs.forEach((pair) => {
      items.push({
        type: "row",
        key: `${pair.dam.id}-${pair.lane.code}`,
        damId: pair.dam.id,
        damName: pair.dam.name,
        laneCode: pair.lane.code,
        laneLabel: pair.lane.label,
        color: pair.lane.color,
        h: laneH,
        stripe: 0,
        chip: pair.chip,
      });
      y += laneH;
    });
    return { items, totalHeight: y };
  }

  const groups = new Map<string, { text: string; children: LeafPair[] }>();
  if (mode === "dam-obl") {
    for (const pair of pairs) {
      const key = `dam:${pair.dam.id}`;
      const g = groups.get(key) ?? { text: pair.dam.name, children: [] };
      g.children.push(pair);
      groups.set(key, g);
    }
  } else {
    for (const pair of pairs) {
      const key = `lane:${pair.lane.code}`;
      const g = groups.get(key) ?? { text: pair.lane.label, children: [] };
      g.children.push(pair);
      groups.set(key, g);
    }
  }

  for (const [key, group] of groups) {
    const isCollapsed = !!collapsed[key];
    items.push({
      type: "heading",
      key,
      text: group.text,
      collapsed: isCollapsed,
      childCount: group.children.length,
      h: headingH,
      stripe: 0,
      chip: earliestNextDue(
        group.children
          .map((c) => c.chip)
          .filter((c): c is NextDueChip => !!c),
      ),
      children: group.children.map((c) => ({
        damId: c.dam.id,
        laneCode: c.lane.code,
      })),
    });
    y += headingH;
    if (!isCollapsed) {
      for (const pair of group.children) {
        items.push({
          type: "row",
          key: `${pair.dam.id}-${pair.lane.code}`,
          damId: pair.dam.id,
          damName: pair.dam.name,
          laneCode: pair.lane.code,
          laneLabel: pair.lane.label,
          color: pair.lane.color,
          h: laneH,
          stripe: 0,
          chip: pair.chip,
        });
        y += laneH;
      }
    }
    items.push({ type: "gap", key: `${key}-gap`, h: gap, stripe: 0 });
    y += gap;
  }

  return { items, totalHeight: y };
}

export function headingKeys(pairs: LeafPair[], mode: GroupMode) {
  if (mode === "flat") return [];
  const keys = new Set<string>();
  for (const pair of pairs) {
    keys.add(
      mode === "dam-obl" ? `dam:${pair.dam.id}` : `lane:${pair.lane.code}`,
    );
  }
  return [...keys];
}
