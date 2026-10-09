import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import { RagDot } from "@/core/ui/RagDot";
import { getDependencies } from "@/core/store/json-store";
import { dependencyRag } from "@/core/access/rag";

const HREF = "/s/dependencies";

export default async function ExternalDependenciesPage() {
  const deps = await getDependencies();
  const node = getNodeByHref(HREF);

  return (
    <AppShell currentHref={HREF}>
      <PageNav href={HREF} />
      <header className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            External dependencies
          </h1>
          {node ? <CodeBadge node={node} /> : null}
          {node ? <StatusPill status={node.status} /> : null}
        </div>
        <p className="max-w-xl text-[var(--muted)]">
          Dated list with RAG. Amber is within 3 months. Red is within 14 days
          or already expired. Attention cascades to the System card on Home.
        </p>
      </header>
      <ul className="space-y-3">
        {deps.map((dep) => {
          const rag = dependencyRag(dep);
          return (
            <li key={dep.id} className="sg-card">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <RagDot level={rag} />
                <h2 className="font-medium">{dep.name}</h2>
                <span className="text-xs text-[var(--muted)]">{dep.type}</span>
              </div>
              <p className="text-sm text-[var(--muted)]">{dep.notes}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                <span>Expires: {dep.expiresAt ?? "—"}</span>
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
    </AppShell>
  );
}
