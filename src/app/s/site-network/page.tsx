import Link from "next/link";
import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { getHubs, getChildren, getNodeByHref } from "@/core/registry";
import { HubColorWheel } from "@/core/shell/HubColorWheel";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";

const HREF = "/s/site-network";

export default function SiteNetworkMapPage() {
  const hubs = getHubs();
  const node = getNodeByHref(HREF);

  return (
    <AppShell currentHref={HREF}>
      <PageNav href={HREF} />
      <header className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Site network map</h1>
          {node ? <CodeBadge node={node} /> : null}
          {node ? <StatusPill status={node.status} /> : null}
        </div>
        <p className="max-w-xl text-[var(--muted)]">
          Home, hubs, and cards. The map updates when a card is framed elsewhere.
        </p>
      </header>
      <section className="mb-8">
        <h2 className="text-lg font-semibold">Colour wheel</h2>
        <p className="mb-3 max-w-xl text-sm text-[var(--muted)]">
          Hue around the rim, saturation out from the centre. Larger dots are hubs.
          Hover a dot for its name.
        </p>
        <HubColorWheel hubs={hubs} />
      </section>
      <ul className="space-y-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <li>
          <Link href="/home" className="font-medium hover:underline">
            Home
          </Link>
        </li>
        {hubs.map((hub) => (
          <li key={hub.id}>
            <Link href={hub.href} className="font-medium hover:underline">
              {hub.title}
            </Link>
            <ul className="ml-4 mt-1 space-y-1 border-l border-[var(--border)] pl-3">
              {getChildren(hub.id).map((child) => (
                <li key={child.id} className="flex flex-wrap items-center gap-2">
                  <Link href={child.href} className="hover:underline">
                    {child.title}
                  </Link>
                  <CodeBadge node={child} />
                  <span className="text-xs text-[var(--muted)]">{child.status}</span>
                  {child.pendingDelete ? (
                    <span className="text-xs text-[var(--muted)]">To delete</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
