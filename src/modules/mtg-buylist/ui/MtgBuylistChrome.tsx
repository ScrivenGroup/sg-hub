import type { ReactNode } from "react";
import { AppShell } from "@/core/shell/AppShell";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import type { DevHostKind } from "@/core/kanban/host";
import { MTG_BUYLIST_HREF } from "../schema";
import { MTG_BUYLIST_VERSION, MTG_BUYLIST_VERSION_WHEN } from "../version";
import { MtgBuylistLeafBody } from "./MtgBuylistNav";

export function MtgBuylistChrome({
  children,
  canRaise = true,
  hostKind,
  host,
}: {
  children?: ReactNode;
  canRaise?: boolean;
  hostKind?: DevHostKind;
  host?: string;
}) {
  const node = getNodeByHref(MTG_BUYLIST_HREF);

  return (
    <AppShell
      currentHref={MTG_BUYLIST_HREF}
      frameClassName="h-dvh max-h-dvh overflow-hidden"
      mainClassName="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 pb-3 pt-0"
      title={
        <h1 className="flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
          <span className="truncate">{node?.title ?? "MTG Buylist"}</span>
          <span
            className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]"
            title="Product version"
          >
            v{MTG_BUYLIST_VERSION}
            <span className="ml-1.5 font-normal">{MTG_BUYLIST_VERSION_WHEN}</span>
          </span>
          {node ? <CodeBadge node={node} /> : null}
          {node ? <StatusPill status={node.status} /> : null}
        </h1>
      }
    >
      <MtgBuylistLeafBody canRaise={canRaise} hostKind={hostKind} host={host}>
        {children}
      </MtgBuylistLeafBody>
    </AppShell>
  );
}
