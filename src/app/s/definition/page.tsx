import Link from "next/link";
import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { getHubs, getChildren } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { RagDot } from "@/core/ui/RagDot";
import { getDependencies } from "@/core/store/json-store";
import { dependencyRag, systemHubRag } from "@/core/access/rag";

export default async function DefinitionPage() {
  const hubs = getHubs();
  const deps = await getDependencies();
  const hubRag = systemHubRag(deps);

  return (
    <AppShell currentHref="/s/definition">
      <PageNav href="/s/definition" />
      <header className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Definition</h1>
          <RagDot level={hubRag} size={12} />
        </div>
        <p className="max-w-xl text-[var(--muted)]">
          Site map, external dependencies, and system definition. Maps update
          when sub-hubs are framed elsewhere.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Site network map</h2>
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
                    <span className="text-xs text-[var(--muted)]">
                      {child.status}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">External dependencies</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Dated list with RAG. Amber ≤ 3 months; red ≤ 14 days or expired.
          Attention cascades to the System card on Home.
        </p>
        <ul className="space-y-3">
          {deps.map((dep) => {
            const rag = dependencyRag(dep);
            return (
              <li key={dep.id} className="sg-card">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <RagDot level={rag} />
                  <h3 className="font-medium">{dep.name}</h3>
                  <span className="text-xs text-[var(--muted)]">{dep.type}</span>
                </div>
                <p className="text-sm text-[var(--muted)]">{dep.notes}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                  <span>
                    Expires: {dep.expiresAt ?? "—"}
                  </span>
                  {dep.externalUrl ? (
                    <a
                      href={dep.externalUrl}
                      className="font-medium text-[var(--ink)] underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open source
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </AppShell>
  );
}
