import { auth, isMrtGuest } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { hostKindFromHeaders } from "@/core/kanban/host";
import { kanbanLeafOptions } from "@/core/kanban/leaves";
import { KANBAN_GLOBAL_NODE_ID } from "@/core/kanban/schema";
import { KanbanOnlineHost } from "@/core/kanban/ui/KanbanOnlineHost";
import { getChangelogsForNode, getKanbanAllBoard } from "@/core/store/json-store";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";

export const dynamic = "force-dynamic";

export default async function InternalKanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const params = await searchParams;
  const raw = params.tab;
  const initialTab =
    raw === "kanban" ? "kanban" : raw === "changelog" ? "changelog" : "inbox";
  const board = await getKanbanAllBoard();
  const changelogs = await getChangelogsForNode("i-kanban");
  const { kind } = hostKindFromHeaders(await headers());
  const node = getNodeByHref("/i/kanban");
  const leafOptions = kanbanLeafOptions();
  const href = "/i/kanban";

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
          <h1 className="text-lg font-semibold tracking-tight">Kanban Online</h1>
          {node ? <CodeBadge node={node} /> : null}
        </div>
      </header>
      <KanbanOnlineHost
        board={board}
        scope="all"
        nodeId={KANBAN_GLOBAL_NODE_ID}
        leafTitle="Internal"
        leafHref="/i"
        revalidateHref={href}
        inboxHref={`${href}?tab=inbox`}
        hostKind={kind}
        leafOptions={leafOptions}
        defaultTagNodeId={KANBAN_GLOBAL_NODE_ID}
        showTabs
        initialTab={initialTab}
        changelogs={changelogs}
      />
    </AppShell>
  );
}
