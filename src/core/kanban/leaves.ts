import { getNodeByHref, getNodes, siteNetworkTree } from "@/core/registry";
import { KANBAN_GLOBAL_NODE_ID } from "./schema";

export type KanbanLeafOption = {
  id: string;
  title: string;
};

/** Chrome tools that are the capture surface, not a product leaf to tag. */
const UNTAGGABLE_TOOL_IDS = new Set(["i-kanban", "i-feedback"]);

function taggableLeaves(): KanbanLeafOption[] {
  const { childrenByHub } = siteNetworkTree();
  const leaves: KanbanLeafOption[] = [];
  for (const children of Object.values(childrenByHub)) {
    for (const node of children) {
      if (node.kind === "hub") continue;
      if (UNTAGGABLE_TOOL_IDS.has(node.id)) continue;
      leaves.push({ id: node.id, title: node.title });
    }
  }
  leaves.sort((a, b) => a.title.localeCompare(b.title, "en"));
  return leaves;
}

/** Global + every non-hub Site network child (any hub). Do not invent hubs here. */
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

function isTaggableRegistryLeaf(node: {
  id: string;
  kind: string;
  parentId: string | null;
}): boolean {
  if (UNTAGGABLE_TOOL_IDS.has(node.id)) return false;
  return node.kind !== "hub" && node.parentId != null;
}

export function defaultKanbanNodeIdFromHref(href: string): string {
  const normalized = href.replace(/\/$/, "") || "/";
  const exact = getNodeByHref(normalized);
  if (exact && isTaggableRegistryLeaf(exact)) {
    return exact.id;
  }
  const prefix = getNodes()
    .filter(
      (node) =>
        isTaggableRegistryLeaf(node) &&
        node.href !== "/" &&
        (normalized === node.href || normalized.startsWith(`${node.href}/`)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  return prefix?.id ?? KANBAN_GLOBAL_NODE_ID;
}
