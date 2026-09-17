import { Suspense } from "react";
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
  getStandardsChoices,
  getStandardsHolds,
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
  const choices = development ? {} : await getStandardsChoices();
  const holds = development ? [] : await getStandardsHolds();

  const title = (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Standards</h1>
        {node ? <CodeBadge node={node} /> : null}
        {node ? <StatusPill status={node.status} /> : null}
      </div>
      <p className="max-w-2xl text-[var(--muted)]">
        Hub home for design and process. Design Library is the kit.
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
        {mode === "design" ? <DesignLibraryTab choices={choices} /> : null}
        {mode === "behaviours" ? <BehavioursTab /> : null}
        {mode === "process" ? <ProcessTab /> : null}
        {mode === "home" ? <HomeTab holds={holds} /> : null}
      </AppShell>
    );
  }

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
      <Suspense fallback={<DevelopmentFallback />}>
        <StandardsDevelopment tab={params.tab} />
      </Suspense>
    </AppShell>
  );
}

function DevelopmentFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-sm text-[var(--muted)]">Loading Development…</p>
      <div className="h-10 animate-pulse rounded-[10px] bg-[var(--surface-muted)]" />
      <div className="min-h-0 flex-1 animate-pulse rounded-[10px] bg-[var(--surface-muted)]" />
    </div>
  );
}

async function StandardsDevelopment({ tab }: { tab?: string }) {
  const [board, changelogs, notes, headerList] = await Promise.all([
    getKanbanBoard(STANDARDS_NODE_ID),
    getChangelogsForNode(STANDARDS_NODE_ID),
    getKanbanLeafNotes(STANDARDS_NODE_ID),
    headers(),
  ]);
  const { kind } = hostKindFromHeaders(headerList);

  return (
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
      initialTab={standardsKanbanStart(tab)}
      changelogs={changelogs}
      notes={notes}
      showDesignSpec={false}
    />
  );
}
