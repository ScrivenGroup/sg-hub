import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import { DUMMY_STREAMS } from "@/core/roadmap/dummy";
import { RoadmapPlayground } from "@/core/roadmap/ui/RoadmapPlayground";

const HREF = "/i/roadmap";

export const dynamic = "force-dynamic";

export default function RoadmapPage() {
  const node = getNodeByHref(HREF);

  return (
    <AppShell
      currentHref={HREF}
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
      <PageNav href={HREF} compact className="mb-1" />
      <RoadmapPlayground initial={DUMMY_STREAMS} />
    </AppShell>
  );
}
