"use client";

import type { ChangelogEntry } from "@/core/contracts/types";
import type { DevHostKind } from "@/core/kanban/host";
import { kanbanLeafOptions } from "@/core/kanban/leaves";
import type { KanbanBoard } from "@/core/kanban/schema";
import { KanbanOnlineHost } from "@/core/kanban/ui/KanbanOnlineHost";
import type { ScheduleStore } from "../schema";

export function DevelopmentTab({
  changelogs,
  store,
  onChange,
  board,
  hostKind,
}: {
  changelogs: ChangelogEntry[];
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
  board: KanbanBoard;
  hostKind: DevHostKind;
}) {
  return (
    <KanbanOnlineHost
      board={board}
      scope="leaf"
      nodeId="w-sunwater-mrt"
      leafTitle="Sunwater MRT"
      leafHref="/w/sunwater-mrt"
      revalidateHref="/w/sunwater-mrt"
      inboxHref="/w/sunwater-mrt?tab=inbox"
      hostKind={hostKind}
      leafOptions={kanbanLeafOptions()}
      defaultTagNodeId="w-sunwater-mrt"
      showTabs
      initialTab="changelog"
      changelogs={changelogs}
      notes={store.openNotes || ""}
      onSaveNotes={async (body) => {
        const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
        next.openNotes = body;
        onChange(next);
        return { ok: true };
      }}
    />
  );
}
