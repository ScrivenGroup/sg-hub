import { COLUMN_FILTERS } from "./schema";

export const DEVELOPMENT_HUB_HREF = "/d";
export const DEVELOPMENT_INBOX_HREF = "/d/inbox";

/** Today's wrapping-suite changelog nodes. Relabel/combine is kt-sg-hub-changelog. */
export const SG_HUB_CHANGELOG_NODE_IDS = ["hub-development", "i-kanban"] as const;

const TAB_TO_HREF: Record<string, string> = {
  inbox: "/d/inbox",
  kanban: "/d/kanban",
  changelog: "/d/changelog",
  notes: "/d/notes",
  spec: "/d/spec",
};

for (const filter of COLUMN_FILTERS) {
  TAB_TO_HREF[filter.id] = "/d/kanban";
}

/** Old `/d?tab=` URLs and Internal redirects. Unknown tab → hub landing. */
export function developmentHubPathForTab(tab?: string): string {
  if (!tab) return DEVELOPMENT_HUB_HREF;
  return TAB_TO_HREF[tab] ?? DEVELOPMENT_HUB_HREF;
}
