import { auth, isMrtGuest } from "@/auth";
import { headers } from "next/headers";
import { AppShell } from "@/core/shell/AppShell";
import { hostKindFromHeaders } from "@/core/kanban/host";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import {
  getGuestMrtSandbox,
  getChangelogsForNode,
  getKanbanBoard,
  getSunwaterMrtStore,
} from "@/core/store/json-store";
import {
  assertGuestShareOrSignOut,
} from "@/modules/sunwater-mrt/actions";
import { MrtWorkspace } from "@/modules/sunwater-mrt/ui/MrtWorkspace";
import { MRT_VERSION, MRT_VERSION_WHEN } from "@/modules/sunwater-mrt/version";

const HREF = "/w/sunwater-mrt";

export default async function SunwaterMrtPage() {
  const session = await auth();
  const guest = isMrtGuest(session);
  if (guest) await assertGuestShareOrSignOut();

  const node = getNodeByHref(HREF);
  const guestId = session?.user?.id;
  const store =
    guest && guestId
      ? await getGuestMrtSandbox(guestId)
      : await getSunwaterMrtStore();
  const changelogs = await getChangelogsForNode("w-sunwater-mrt");
  const board = await getKanbanBoard("w-sunwater-mrt");
  const { kind } = hostKindFromHeaders(await headers());

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
          <span
            className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]"
            title="Product version"
          >
            v{MRT_VERSION}
            <span className="ml-1.5 font-normal">
              {MRT_VERSION_WHEN}
            </span>
          </span>
          <CodeBadge node={node} />
          <StatusPill status={node.status} />
        </h1>
      }
    >
      <MrtWorkspace
        initialStore={store}
        changelogs={changelogs}
        showDevelopment={!guest}
        readOnly={false}
        sandbox={guest}
        board={board}
        hostKind={kind}
      />
    </AppShell>
  );
}
