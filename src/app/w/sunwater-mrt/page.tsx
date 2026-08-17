import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { getNodeByHref, getNodeById } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import {
  getChangelogsForNode,
  getSunwaterMrtStore,
} from "@/core/store/json-store";
import { MrtTabs } from "@/modules/sunwater-mrt/MrtTabs";

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

  const parent = node.parentId ? getNodeById(node.parentId) : null;

  return (
    <AppShell currentHref={HREF}>
      <PageNav href={HREF} />
      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{node.title}</h1>
          <CodeBadge node={node} />
          <StatusPill status={node.status} />
        </div>
        <p className="max-w-2xl text-[var(--muted)]">{node.description}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Access: {node.accessMode.replace("_", " ")} · Path {node.href}
          {parent ? ` · Under ${parent.title}` : null}
          {" · "}
          Store v{store.version}
          {store.updatedAt
            ? ` · Updated ${new Date(store.updatedAt).toLocaleString()}`
            : " · empty payload"}
        </p>
      </header>

      <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-4">
        <MrtTabs />
      </div>

      {changelogs.length > 0 ? (
        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold">Changelog / plan</h2>
          {changelogs.map((entry) => (
            <article key={entry.id} className="sg-card">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">{entry.title}</h3>
                <time className="text-xs text-[var(--muted)]">
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </div>
              <div className="sg-prose text-[var(--ink)]">{entry.body}</div>
            </article>
          ))}
        </section>
      ) : null}
    </AppShell>
  );
}
