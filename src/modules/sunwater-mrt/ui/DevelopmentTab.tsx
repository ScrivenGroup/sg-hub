"use client";

import { useEffect, useState } from "react";
import type { ChangelogEntry } from "@/core/contracts/types";
import type { DevHostKind } from "@/core/kanban/host";
import { kanbanLeafOptions } from "@/core/kanban/leaves";
import type { KanbanBoard } from "@/core/kanban/schema";
import { KanbanOnlineHost } from "@/core/kanban/ui/KanbanOnlineHost";
import { loadMrtKanbanBoardAction } from "../actions";
import type { ScheduleStore } from "../schema";
import { MrtLoadingPane } from "./MrtLoadingPane";

export function DevelopmentTab({
  changelogs,
  store,
  onChange,
  hostKind,
}: {
  changelogs: ChangelogEntry[];
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
  hostKind: DevHostKind;
}) {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMrtKanbanBoardAction().then((result) => {
      if (cancelled) return;
      if (result.ok) setBoard(result.board);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="pt-4 text-sm text-[var(--muted)]">{error}</p>;
  }
  if (!board) {
    return (
      <MrtLoadingPane
        step={2}
        total={2}
        label="development board"
        showDevelopment
        showChrome={false}
      />
    );
  }

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
      showDesignSpec={false}
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
