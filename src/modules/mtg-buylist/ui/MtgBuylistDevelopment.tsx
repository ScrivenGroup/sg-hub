"use client";

import { useState, useTransition } from "react";
import type { ChangelogEntry } from "@/core/contracts/types";
import { KanbanOnlineHost, type KanbanOnlineStart } from "@/core/kanban/ui/KanbanOnlineHost";
import { InfoTip } from "@/core/ui/InfoTip";
import { type DevHostKind, type DevTab } from "@/core/kanban/host";
import { kanbanLeafOptions } from "@/core/kanban/leaves";
import { type KanbanBoard as KanbanBoardData } from "@/core/kanban/schema";
import { parserSelfCheckAction, saveBuylistNotesAction } from "../actions";
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
  host: string;
  initialTab: DevTab;
}) {
  const [testing, setTesting] = useState(initialTab === "testing");
  const [check, setCheck] = useState("");
  const [pending, startTransition] = useTransition();
  const devHref = `${MTG_BUYLIST_HREF}/development`;
  const hostTab: KanbanOnlineStart =
    initialTab === "testing" || initialTab === "spec" ? "changelog" : initialTab;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={testing}
          className="sg-tab"
          onClick={() => setTesting(true)}
        >
          Testing
        </button>
      </div>
      {testing ? (
        <section className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <div className="sg-card">
            <h3 className="mb-2 flex items-center gap-1.5 font-medium">
              Parser fixture check
              <InfoTip label="Tiny DDH-shaped fixtures (not the live dumps). Confirms cents, name stripper, and allocate buckets." />
            </h3>
            <button
              type="button"
              className="sg-btn-secondary disabled:opacity-50"
              disabled={pending}
              onClick={() => {
                setCheck("");
                startTransition(async () => {
                  const result = await parserSelfCheckAction();
                  if ("error" in result && result.error && !("messages" in result)) {
                    setCheck(result.error);
                    return;
                  }
                  const messages = "messages" in result ? result.messages : [];
                  setCheck(
                    result.ok
                      ? "Parser check passed."
                      : `Parser check failed:\n${messages.join("\n")}`,
                  );
                });
              }}
            >
              Run parser check
            </button>
            {check ? <pre className="sg-prose mt-3 text-sm">{check}</pre> : null}
          </div>
          <button type="button" className="sg-btn-ghost text-sm" onClick={() => setTesting(false)}>
            Back to Development template
          </button>
        </section>
      ) : (
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
          initialTab={hostTab}
          changelogs={changelogs}
          notes={notes}
          onSaveNotes={async (body) => {
            const result = await saveBuylistNotesAction(body);
            return { ok: result.ok, error: result.ok ? undefined : result.error };
          }}
        />
      )}
    </div>
  );
}
