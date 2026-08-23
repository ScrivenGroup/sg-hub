import { auth, isMrtGuest } from "@/auth";
import { AppShell } from "@/core/shell/AppShell";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import {
  getChangelogsForNode,
  getGuestMrtSandbox,
  getSunwaterMrtStore,
} from "@/core/store/json-store";
import { MrtWorkspace } from "@/modules/sunwater-mrt/ui/MrtWorkspace";

const HREF = "/w/sunwater-mrt";

export default async function SunwaterMrtPage() {
  const session = await auth();
  const guest = isMrtGuest(session);
  const node = getNodeByHref(HREF);
  const store = guest && session?.user?.id
    ? await getGuestMrtSandbox(session.user.id)
    : await getSunwaterMrtStore();
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
      mainClassName="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-3 pt-0"
      title={
        <h1 className="flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
          <span className="truncate">{node.title}</span>
          <CodeBadge node={node} />
          <StatusPill status={node.status} />
        </h1>
      }
    >
      <MrtWorkspace
        initialStore={store}
        changelogs={changelogs}
        showDevelopment={node.status === "building"}
        sandbox={guest}
      />
    </AppShell>
  );
}
