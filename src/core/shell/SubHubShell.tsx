import Link from "next/link";
import { AppShell } from "@/core/shell/AppShell";
import { getNodeByHref, getNodeById } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import type { ChangelogEntry } from "@/core/contracts/types";

export function SubHubShell({
  href,
  changelogs,
  extra,
}: {
  href: string;
  changelogs?: ChangelogEntry[];
  extra?: React.ReactNode;
}) {
  const node = getNodeByHref(href);
  if (!node) {
    return (
      <AppShell currentHref={href}>
        <p>Not found.</p>
      </AppShell>
    );
  }
  const parent = node.parentId ? getNodeById(node.parentId) : null;

  return (
    <AppShell currentHref={href}>
      <div className="mb-2 text-sm text-[var(--muted)]">
        {parent ? (
          <Link href={parent.href} className="hover:underline">
            {parent.title}
          </Link>
        ) : null}
        <span aria-hidden> / </span>
        <span>{node.title}</span>
      </div>
      <header className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{node.title}</h1>
          <CodeBadge node={node} />
          <StatusPill status={node.status} />
        </div>
        <p className="max-w-2xl text-[var(--muted)]">{node.description}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Access: {node.accessMode.replace("_", " ")} · Path {node.href}
        </p>
      </header>

      {node.status === "sketched" ? (
        <div className="sg-card mb-6 border-dashed">
          <p className="font-medium">Featureless shell</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Framed for future development. Build features on desktop against the
            plan in the changelog below.
          </p>
        </div>
      ) : null}

      {extra}

      {changelogs && changelogs.length > 0 ? (
        <section className="space-y-4">
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
