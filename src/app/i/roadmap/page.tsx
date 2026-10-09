import { headers } from "next/headers";
import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import { hostKindFromHeaders } from "@/core/kanban/host";
import { kanbanLeafOptions } from "@/core/kanban/leaves";
import { KanbanOnlineHost } from "@/core/kanban/ui/KanbanOnlineHost";
import {
  getChangelogsForNode,
  getKanbanBoard,
  getKanbanLeafNotes,
} from "@/core/store/json-store";
import { DUMMY_STREAMS } from "@/core/roadmap/dummy";
import {
  ROADMAP_HREF,
  ROADMAP_NODE_ID,
  isRoadmapHostTab,
  parseRoadmapTab,
  roadmapLeafLevel,
  roadmapTabHref,
  type RoadmapDevTab,
} from "@/core/roadmap/tabs";
import { RoadmapPlayground } from "@/core/roadmap/ui/RoadmapPlayground";
import { RoadmapRequirements } from "@/core/roadmap/ui/RoadmapRequirements";
import { RoadmapTabs } from "@/core/roadmap/ui/RoadmapTabs";
import { RoadmapV2Placeholder } from "@/core/roadmap/ui/RoadmapV2Placeholder";

export const dynamic = "force-dynamic";

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = parseRoadmapTab(params.tab);
  const level = roadmapLeafLevel(tab);
  const node = getNodeByHref(ROADMAP_HREF);

  return (
    <AppShell
      currentHref={ROADMAP_HREF}
      frameClassName="h-dvh max-h-dvh overflow-hidden"
      mainClassName="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pb-2 pt-0"
      title={
        <h1 className="flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
          <span className="truncate">Roadmap</span>
          {node ? <CodeBadge node={node} /> : null}
          {node ? <StatusPill status={node.status} /> : null}
        </h1>
      }
    >
      <PageNav href={ROADMAP_HREF} compact className="mb-1" />
      <RoadmapTabs tab={tab} />
      {level === "v1" ? <RoadmapPlayground initial={DUMMY_STREAMS} /> : null}
      {level === "v2" ? <RoadmapV2Placeholder /> : null}
      {level === "development" && tab === "requirements" ? <RoadmapRequirements /> : null}
      {isRoadmapHostTab(tab) ? <RoadmapDevelopment tab={tab} /> : null}
    </AppShell>
  );
}

async function RoadmapDevelopment({ tab }: { tab: Exclude<RoadmapDevTab, "requirements"> }) {
  const [board, changelogs, notes, headerList] = await Promise.all([
    getKanbanBoard(ROADMAP_NODE_ID),
    getChangelogsForNode(ROADMAP_NODE_ID),
    getKanbanLeafNotes(ROADMAP_NODE_ID),
    headers(),
  ]);
  const { kind } = hostKindFromHeaders(headerList);

  return (
    <KanbanOnlineHost
      board={board}
      scope="leaf"
      nodeId={ROADMAP_NODE_ID}
      leafTitle="Roadmap"
      leafHref={ROADMAP_HREF}
      revalidateHref={roadmapTabHref(tab)}
      inboxHref={roadmapTabHref("inbox")}
      hostKind={kind}
      leafOptions={kanbanLeafOptions()}
      defaultTagNodeId={ROADMAP_NODE_ID}
      showTabs={false}
      forcedTab={tab}
      changelogs={changelogs}
      notes={notes}
      showDesignSpec={false}
      changelogClock="leaf"
    />
  );
}
