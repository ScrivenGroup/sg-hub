import { auth, isMrtGuest } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { hostKindFromHeaders } from "@/core/kanban/host";
import { kanbanLeafOptions } from "@/core/kanban/leaves";
import { KanbanOnlineHost } from "@/core/kanban/ui/KanbanOnlineHost";
import {
  getChangelogsForNode,
  getKanbanBoard,
  getKanbanLeafNotes,
  getStandardsDrops,
} from "@/core/store/json-store";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import {
  STANDARDS_HREF,
  STANDARDS_NODE_ID,
  isStandardsDevelopmentQuery,
  standardsKanbanStart,
  standardsMode,
} from "@/modules/standards/schema";
import { BehavioursTab } from "@/modules/standards/ui/BehavioursTab";
import { DesignLibraryTab } from "@/modules/standards/ui/DesignLibraryTab";
import { DropTab } from "@/modules/standards/ui/DropTab";
import { HomeTab } from "@/modules/standards/ui/HomeTab";
import { ProcessTab } from "@/modules/standards/ui/ProcessTab";
import { StandardsNav } from "@/modules/standards/ui/StandardsNav";

export const dynamic = "force-dynamic";

export default async function StandardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const params = await searchParams;
  const development = isStandardsDevelopmentQuery(params.tab);
  const node = getNodeByHref(STANDARDS_HREF);
  const mode = standardsMode(params.tab);
  const drops = development ? [] : await getStandardsDrops();

  const title = (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Standards</h1>
        {node ? <CodeBadge node={node} /> : null}
        {node ? <StatusPill status={node.status} /> : null}
      </div>
      <p className="max-w-2xl text-[var(--muted)]">
        Hub home for design and process. Drop pile for live notes from other
        sittings.
      </p>
    </>
  );

  if (!development) {
    return (
      <AppShell currentHref={STANDARDS_HREF}>
        <PageNav href={STANDARDS_HREF} />
        <header className="mb-6">{title}</header>
        <div className="mb-6">
          <StandardsNav mode={mode} />
        </div>
        {mode === "drop" ? <DropTab items={drops} /> : null}
        {mode === "design" ? <DesignLibraryTab /> : null}
        {mode === "behaviours" ? <BehavioursTab /> : null}
        {mode === "process" ? <ProcessTab /> : null}
        {mode === "home" ? <HomeTab drops={drops} /> : null}
      </AppShell>
    );
  }

  const board = await getKanbanBoard(STANDARDS_NODE_ID);
  const changelogs = await getChangelogsForNode(STANDARDS_NODE_ID);
  const notes = await getKanbanLeafNotes(STANDARDS_NODE_ID);
  const { kind } = hostKindFromHeaders(await headers());

  return (
    <AppShell
      currentHref={STANDARDS_HREF}
      frameClassName="h-dvh max-h-dvh overflow-hidden"
      mainClassName="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 pb-3 pt-3"
    >
      <div className="shrink-0">
        <PageNav href={STANDARDS_HREF} compact />
      </div>
      <header className="mb-1 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Standards</h1>
          {node ? <CodeBadge node={node} /> : null}
          {node ? <StatusPill status={node.status} /> : null}
        </div>
      </header>
      <div className="mb-1 shrink-0">
        <StandardsNav mode={mode} />
      </div>
      <KanbanOnlineHost
        board={board}
        scope="leaf"
        nodeId={STANDARDS_NODE_ID}
        leafTitle="Standards"
        leafHref={STANDARDS_HREF}
        revalidateHref={STANDARDS_HREF}
        inboxHref={`${STANDARDS_HREF}?tab=inbox`}
        hostKind={kind}
        leafOptions={kanbanLeafOptions()}
        defaultTagNodeId={STANDARDS_NODE_ID}
        showTabs
        initialTab={standardsKanbanStart(params.tab)}
        changelogs={changelogs}
        notes={notes}
        showDesignSpec={false}
      />
    </AppShell>
  );
}
