import { getNodeByHref, getNodes, siteNetworkTree } from "@/core/registry";
import { KANBAN_GLOBAL_NODE_ID } from "./schema";

export type KanbanLeafOption = {
  id: string;
  title: string;
};

/** Redirects / retired Internal tools. Hubs are taggable (IN-20260918-06). */
const UNTAGGABLE_TOOL_IDS = new Set([
  "i-kanban",
  "i-feedback",
  "i-ideas",
  "i-notes",
  "d-ideas-feedback",
  "d-kanban",
  "d-train-changelog",
  "d-sg-hub-changelog",
  "d-notes",
  "d-design-spec",
]);

function taggableLeaves(): KanbanLeafOption[] {
  const { hubs, childrenByHub } = siteNetworkTree();
  const leaves: KanbanLeafOption[] = [];
  for (const hub of hubs) {
    if (!UNTAGGABLE_TOOL_IDS.has(hub.id)) {
      leaves.push({ id: hub.id, title: hub.title });
    }
    for (const node of childrenByHub[hub.id] ?? []) {
      if (UNTAGGABLE_TOOL_IDS.has(node.id)) continue;
      leaves.push({ id: node.id, title: node.title });
    }
  }
  leaves.sort((a, b) => a.title.localeCompare(b.title, "en"));
  return leaves;
}

/** Global + every Site network hub and child except retired chrome tools. */
export function kanbanLeafOptions(): KanbanLeafOption[] {
  return [{ id: KANBAN_GLOBAL_NODE_ID, title: "Global" }, ...taggableLeaves()];
}

/** Leaves that already have an idea or ticket row. Keep `keepId` even if the count is now 0. */
export function leafOptionsWithRows(
  options: KanbanLeafOption[],
  board: { ideas: { nodeId: string }[]; tickets: { nodeId: string }[] },
  keepId?: string,
): KanbanLeafOption[] {
  const present = new Set<string>();
  for (const row of board.ideas) present.add(row.nodeId);
  for (const row of board.tickets) present.add(row.nodeId);
  return options.filter((opt) => present.has(opt.id) || opt.id === keepId);
}

export function kanbanLeafLabel(
  nodeId: string,
  options: KanbanLeafOption[] = kanbanLeafOptions(),
): string {
  return options.find((row) => row.id === nodeId)?.title ?? nodeId;
}

export function isKanbanLeafId(nodeId: string): boolean {
  return kanbanLeafOptions().some((row) => row.id === nodeId);
}

function isTaggableRegistryNode(node: {
  id: string;
  kind: string;
  parentId: string | null;
}): boolean {
  if (UNTAGGABLE_TOOL_IDS.has(node.id)) return false;
  if (node.kind === "hub") return true;
  return node.parentId != null;
}

const CHROME_GLOBAL_HREFS = new Set(["/i/kanban", "/i/feedback", "/i/ideas", "/i/notes"]);

export function defaultKanbanNodeIdFromHref(href: string): string {
  const normalized = href.replace(/\/$/, "") || "/";
  if (CHROME_GLOBAL_HREFS.has(normalized)) return KANBAN_GLOBAL_NODE_ID;
  const exact = getNodeByHref(normalized);
  if (exact) {
    if (isTaggableRegistryNode(exact)) return exact.id;
    if (UNTAGGABLE_TOOL_IDS.has(exact.id)) {
      if (exact.parentId) {
        const parent = getNodes().find((node) => node.id === exact.parentId);
        if (parent?.kind === "hub") return parent.id;
      }
      return KANBAN_GLOBAL_NODE_ID;
    }
  }
  const prefix = getNodes()
    .filter(
      (node) =>
        isTaggableRegistryNode(node) &&
        node.href !== "/" &&
        (normalized === node.href || normalized.startsWith(`${node.href}/`)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  return prefix?.id ?? KANBAN_GLOBAL_NODE_ID;
}
