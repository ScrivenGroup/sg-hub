"use client";

import type { ChangelogEntry } from "@/core/contracts/types";
import { KanbanOnlineHost } from "@/core/kanban/ui/KanbanOnlineHost";
import { type DevHostKind, type DevTab } from "@/core/kanban/host";
import { kanbanLeafOptions } from "@/core/kanban/leaves";
import { type KanbanBoard as KanbanBoardData } from "@/core/kanban/schema";
import { saveBuylistNotesAction } from "../actions";
import { MTG_BUYLIST_HREF, MTG_BUYLIST_NODE_ID } from "../schema";

export function MtgBuylistDevelopment({
  changelogs,
  notes,
  board,
  hostKind,
  initialTab,
}: {
  changelogs: ChangelogEntry[];
  notes: string;
  board: KanbanBoardData;
  hostKind: DevHostKind;
  initialTab: DevTab;
}) {
  const devHref = `${MTG_BUYLIST_HREF}/development`;

  return (
    <KanbanOnlineHost
      board={board}
      scope="leaf"
      nodeId={MTG_BUYLIST_NODE_ID}
      leafTitle="MTG Buylist"
      leafHref={MTG_BUYLIST_HREF}
      revalidateHref={devHref}
      inboxHref={`${devHref}?tab=inbox`}
      hostKind={hostKind}
      leafOptions={kanbanLeafOptions()}
      defaultTagNodeId={MTG_BUYLIST_NODE_ID}
      showTabs
      showDesignSpec={false}
      initialTab={initialTab}
      changelogs={changelogs}
      notes={notes}
      onSaveNotes={async (body) => {
        const result = await saveBuylistNotesAction(body);
        return { ok: result.ok, error: result.ok ? undefined : result.error };
      }}
    />
  );
}
