import {
  defaultKanbanNodeIdFromHref,
  isKanbanLeafId,
} from "../src/core/kanban/leaves";
import { KANBAN_GLOBAL_NODE_ID } from "../src/core/kanban/schema";

const cases: Array<[string, string]> = [
  ["/d", "hub-development"],
  ["/d/inbox", "hub-development"],
  ["/d/kanban", "hub-development"],
  ["/d/changelog", "hub-development"],
  ["/w", "hub-work"],
  ["/p", "hub-projects"],
  ["/i", "hub-internal"],
  ["/s", "hub-system"],
  ["/i/kanban", KANBAN_GLOBAL_NODE_ID],
  ["/i/feedback", KANBAN_GLOBAL_NODE_ID],
  ["/i/ideas", KANBAN_GLOBAL_NODE_ID],
  ["/i/notes", KANBAN_GLOBAL_NODE_ID],
  ["/w/sunwater-mrt", "w-sunwater-mrt"],
  ["/w/sunwater-mrt/development", "w-sunwater-mrt"],
  ["/p/mtg-buylist", "p-mtg-buylist"],
  ["/home", KANBAN_GLOBAL_NODE_ID],
];

let failed = 0;
for (const [href, want] of cases) {
  const got = defaultKanbanNodeIdFromHref(href);
  if (got !== want) {
    console.log(`fail href=${href} got=${got} want=${want}`);
    failed += 1;
  } else {
    console.log(`ok href=${href} tag=${got}`);
  }
}
if (isKanbanLeafId("i-kanban") || isKanbanLeafId("i-feedback") || isKanbanLeafId("i-ideas") || isKanbanLeafId("i-notes") || isKanbanLeafId("d-kanban") || isKanbanLeafId("d-ideas-feedback")) {
  console.log("fail retired Internal tools or Development rooms still taggable");
  failed += 1;
} else {
  console.log("ok chrome tools not taggable");
}
if (
  !isKanbanLeafId("w-sunwater-mrt") ||
  !isKanbanLeafId(KANBAN_GLOBAL_NODE_ID) ||
  !isKanbanLeafId("hub-development") ||
  !isKanbanLeafId("hub-work")
) {
  console.log("fail product/global/hub not taggable");
  failed += 1;
}
process.exit(failed === 0 ? 0 : 1);
