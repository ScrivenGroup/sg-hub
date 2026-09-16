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
export type GanttSortKey = "dam" | "obligation" | "due";
export type GanttSort = { key: GanttSortKey; dir: 1 | -1 };

export type GanttLayoutItem =
  | {
      type: "heading";
      key: string;
      text: string;
      collapsed: boolean;
      childCount: number;
      h: number;
      top: number;
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
      top: number;
      stripe: number;
      chip: NextDueChip | null;
    }
  | {
      type: "gap";
      key: string;
      h: number;
      top: number;
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
  const dams = store.dams.filter((d) => damFilter.includes(d.id));
  const lanes = store.lanes.filter((l) => laneFilter.includes(l.code));
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

function cmpStr(a: string, b: string, dir: 1 | -1) {
  return a.localeCompare(b) * dir;
}

function cmpDue(a: NextDueChip | null, b: NextDueChip | null, dir: 1 | -1) {
  const av = a?.dueIdx ?? 99999;
  const bv = b?.dueIdx ?? 99999;
  return (av - bv) * dir;
}

function sortPairs(pairs: LeafPair[], sort: GanttSort) {
  return [...pairs].sort((a, b) => {
    if (sort.key === "dam") return cmpStr(a.dam.name, b.dam.name, sort.dir);
    if (sort.key === "obligation") {
      return (
        cmpStr(a.lane.label, b.lane.label, sort.dir) ||
        cmpStr(a.lane.code, b.lane.code, sort.dir)
      );
    }
    return cmpDue(a.chip, b.chip, sort.dir);
  });
}

export function buildGanttLayout(
  pairs: LeafPair[],
  mode: GroupMode,
  collapsed: Record<string, boolean>,
  headingH: number,
  laneH: number,
  gap: number,
  sort: GanttSort | null = null,
): { items: GanttLayoutItem[]; totalHeight: number } {
  const items: GanttLayoutItem[] = [];
  let y = 0;

  if (mode === "flat") {
    const ordered = sort ? sortPairs(pairs, sort) : pairs;
    ordered.forEach((pair) => {
      items.push({
        type: "row",
        key: `${pair.dam.id}-${pair.lane.code}`,
        damId: pair.dam.id,
        damName: pair.dam.name,
        laneCode: pair.lane.code,
        laneLabel: pair.lane.label,
        color: pair.lane.color,
        h: laneH,
        top: y,
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

  let groupList = [...groups.entries()].map(([key, group]) => ({
    key,
    text: group.text,
    children: sort ? sortPairs(group.children, sort) : group.children,
  }));
  if (sort) {
    groupList = [...groupList].sort((a, b) => {
      const aChip = earliestNextDue(
        a.children.map((c) => c.chip).filter((c): c is NextDueChip => !!c),
      );
      const bChip = earliestNextDue(
        b.children.map((c) => c.chip).filter((c): c is NextDueChip => !!c),
      );
      if (sort.key === "due") return cmpDue(aChip, bChip, sort.dir);
      if (sort.key === "dam") {
        if (mode === "dam-obl") return cmpStr(a.text, b.text, sort.dir);
        return cmpStr(
          a.children[0]?.dam.name || a.text,
          b.children[0]?.dam.name || b.text,
          sort.dir,
        );
      }
      if (mode === "obl-dam") return cmpStr(a.text, b.text, sort.dir);
      return cmpStr(
        a.children[0]?.lane.label || a.text,
        b.children[0]?.lane.label || b.text,
        sort.dir,
      );
    });
  }

  for (const group of groupList) {
    const isCollapsed = !!collapsed[group.key];
    items.push({
      type: "heading",
      key: group.key,
      text: group.text,
      collapsed: isCollapsed,
      childCount: group.children.length,
      h: headingH,
      top: y,
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
          top: y,
          stripe: 0,
          chip: pair.chip,
        });
        y += laneH;
      }
    }
    items.push({
      type: "gap",
      key: `${group.key}-gap`,
      h: gap,
      top: y,
      stripe: 0,
    });
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
