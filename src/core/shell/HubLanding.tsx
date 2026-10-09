import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { getChildren, getNodeById } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { PendingNavLink } from "@/core/ui/PendingNavLink";
import { StatusPill } from "@/core/ui/StatusPill";
import { RagDot } from "@/core/ui/RagDot";
import type { RagLevel } from "@/core/contracts/types";

export function HubLanding({
  hubId,
  attention,
}: {
  hubId: string;
  attention?: RagLevel;
}) {
  const hub = getNodeById(hubId);
  if (!hub) {
    return (
      <AppShell currentHref="/home">
        <p>Hub not found.</p>
      </AppShell>
    );
  }
  const children = getChildren(hubId);

  return (
    <AppShell currentHref={hub.href}>
      <PageNav href={hub.href} />
      <header className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{hub.title}</h1>
          {attention ? <RagDot level={attention} size={12} /> : null}
          <CodeBadge node={hub} />
        </div>
        <p className="max-w-xl text-[var(--muted)]">{hub.description}</p>
      </header>
      {children.length === 0 ? (
        <div className="sg-card">
          <p className="font-medium">No sub-hubs yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Frame a product from chat (mobile sketch or desktop build) and it
            will appear here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {children.map((child) => (
            <li key={child.id}>
              <PendingNavLink
                href={child.href}
                className={`sg-card block h-full ${child.pendingDelete ? "opacity-60 grayscale" : ""}`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{child.title}</h2>
                  <CodeBadge node={child} />
                  <StatusPill status={child.status} />
                  {child.pendingDelete ? (
                    <span className="text-xs text-[var(--muted)]">To delete</span>
                  ) : null}
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {child.description}
                </p>
              </PendingNavLink>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
