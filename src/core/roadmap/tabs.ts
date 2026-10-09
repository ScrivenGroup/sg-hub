export const ROADMAP_HREF = "/s/roadmap";
export const ROADMAP_NODE_ID = "i-roadmap";

export const ROADMAP_DEV_TABS = [
  "requirements",
  "inbox",
  "kanban",
  "changelog",
  "notes",
] as const;

export type RoadmapDevTab = (typeof ROADMAP_DEV_TABS)[number];
export type RoadmapLeafTab = "v1" | "v2" | RoadmapDevTab;

export function parseRoadmapTab(raw?: string): RoadmapLeafTab {
  if (raw === "v2") return "v2";
  if (raw === "development" || raw === "requirements") return "requirements";
  if (
    raw === "inbox" ||
    raw === "kanban" ||
    raw === "changelog" ||
    raw === "notes"
  ) {
    return raw;
  }
  return "v1";
}

export function roadmapLeafLevel(tab: RoadmapLeafTab): "v1" | "v2" | "development" {
  if (tab === "v1" || tab === "v2") return tab;
  return "development";
}

export function isRoadmapHostTab(
  tab: RoadmapLeafTab,
): tab is Exclude<RoadmapDevTab, "requirements"> {
  return tab === "inbox" || tab === "kanban" || tab === "changelog" || tab === "notes";
}

export function roadmapTabHref(tab: RoadmapLeafTab): string {
  if (tab === "v1") return ROADMAP_HREF;
  return `${ROADMAP_HREF}?tab=${tab}`;
}
