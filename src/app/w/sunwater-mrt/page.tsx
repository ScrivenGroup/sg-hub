import { AppShell } from "@/core/shell/AppShell";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import {
  getChangelogsForNode,
  getSunwaterMrtStore,
} from "@/core/store/json-store";
import { MrtWorkspace } from "@/modules/sunwater-mrt/ui/MrtWorkspace";

const HREF = "/w/sunwater-mrt";

export default async function SunwaterMrtPage() {
  const node = getNodeByHref(HREF);
  const store = await getSunwaterMrtStore();
  const changelogs = await getChangelogsForNode("w-sunwater-mrt");

  if (!node) {
    return (
      <AppShell currentHref={HREF}>
        <p>Not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      currentHref={HREF}
      mainClassName="px-4 pb-8 pt-3"
    >
      <header className="mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {node.title}
          </h1>
          <CodeBadge node={node} />
          <StatusPill status={node.status} />
        </div>
      </header>

      <MrtWorkspace
        initialStore={store}
        changelogs={changelogs}
        showDevelopment={node.status === "building"}
      />
    </AppShell>
  );
}
