import { auth, isMrtGuest } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { hostKindFromHeaders } from "@/core/kanban/host";
import { kanbanLeafOptions } from "@/core/kanban/leaves";
import { KANBAN_GLOBAL_NODE_ID } from "@/core/kanban/schema";
import { KanbanOnlineHost } from "@/core/kanban/ui/KanbanOnlineHost";
import {
  DEVELOPMENT_HUB_HREF,
  DEVELOPMENT_INBOX_HREF,
  SG_HUB_CHANGELOG_NODE_IDS,
} from "@/core/kanban/development-hub";
import {
  getChangelogsForNodes,
  getKanbanAllBoard,
  getKanbanLeafNotes,
} from "@/core/store/json-store";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";

export type DevelopmentHubPanel =
  | "inbox"
  | "kanban"
  | "changelog"
  | "notes"
  | "spec";

const PANEL_HOST: Record<
  DevelopmentHubPanel,
  {
    initialTab: "inbox" | "kanban" | "changelog" | "notes" | "spec";
    tabSet: "suite" | "board" | "none";
    showDesignSpec: boolean;
    passChangelogs: boolean;
  }
> = {
  inbox: {
    initialTab: "inbox",
    tabSet: "none",
    showDesignSpec: false,
    passChangelogs: false,
  },
  kanban: {
    initialTab: "kanban",
    tabSet: "board",
    showDesignSpec: false,
    passChangelogs: false,
  },
  changelog: {
    initialTab: "changelog",
    tabSet: "none",
    showDesignSpec: false,
    passChangelogs: true,
  },
  notes: {
    initialTab: "notes",
    tabSet: "none",
    showDesignSpec: false,
    passChangelogs: false,
  },
  spec: {
    initialTab: "spec",
    tabSet: "none",
    showDesignSpec: true,
    passChangelogs: false,
  },
};

export async function DevelopmentHubRoom({
  href,
  panel,
}: {
  href: string;
  panel: DevelopmentHubPanel;
}) {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const host = PANEL_HOST[panel];
  const board = await getKanbanAllBoard();
  const changelogs = host.passChangelogs
    ? await getChangelogsForNodes(SG_HUB_CHANGELOG_NODE_IDS)
    : undefined;
  const notes = await getKanbanLeafNotes(KANBAN_GLOBAL_NODE_ID);
  const { kind } = hostKindFromHeaders(await headers());
  const node = getNodeByHref(href);
  const leafOptions = kanbanLeafOptions();

  return (
    <AppShell
      currentHref={href}
      frameClassName="h-dvh max-h-dvh overflow-hidden"
      mainClassName="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 pb-3 pt-3"
    >
      <div className="shrink-0">
        <PageNav href={href} compact />
      </div>
      <header className="mb-1 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">
            {node?.title ?? "Development"}
          </h1>
          {node ? <CodeBadge node={node} /> : null}
        </div>
      </header>
      <KanbanOnlineHost
        board={board}
        scope="all"
        nodeId={KANBAN_GLOBAL_NODE_ID}
        leafTitle="Development"
        leafHref={DEVELOPMENT_HUB_HREF}
        revalidateHref={href}
        inboxHref={DEVELOPMENT_INBOX_HREF}
        hostKind={kind}
        leafOptions={leafOptions}
        defaultTagNodeId={KANBAN_GLOBAL_NODE_ID}
        showTabs={host.tabSet !== "none"}
        tabSet={host.tabSet}
        initialTab={host.initialTab}
        changelogs={changelogs}
        notes={notes}
        showDesignSpec={host.showDesignSpec}
      />
    </AppShell>
  );
}
