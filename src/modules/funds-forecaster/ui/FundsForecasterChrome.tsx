import type { ReactNode } from "react";
import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import type { ChangelogEntry } from "@/core/contracts/types";
import {
  FUNDS_FORECASTER_HREF,
  FundsForecasterNav,
} from "./FundsForecasterNav";

export function FundsForecasterChrome({
  href,
  title,
  intent,
  children,
  changelogs,
}: {
  href: string;
  title: string;
  intent: string;
  children?: ReactNode;
  changelogs?: ChangelogEntry[];
}) {
  const node = getNodeByHref(FUNDS_FORECASTER_HREF);

  return (
    <AppShell currentHref={href}>
      <PageNav href={FUNDS_FORECASTER_HREF} />
      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {node ? <CodeBadge node={node} /> : null}
          {node ? <StatusPill status={node.status} /> : null}
        </div>
        <p className="max-w-2xl text-[var(--muted)]">{intent}</p>
        {node ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Access: {node.accessMode.replace("_", " ")} · Path {href}
          </p>
        ) : null}
      </header>
      <FundsForecasterNav currentHref={href} />
      {children}
      {changelogs && changelogs.length > 0 ? (
        <section className="mt-8 space-y-4">
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
