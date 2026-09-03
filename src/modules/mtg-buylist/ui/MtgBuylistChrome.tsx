import type { ReactNode } from "react";
import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import { MTG_BUYLIST_HREF } from "../schema";
import {
  MTG_BUYLIST_VERSION,
  MTG_BUYLIST_VERSION_WHEN,
} from "../version";
import { MtgBuylistNav } from "./MtgBuylistNav";

export function MtgBuylistChrome({
  href,
  title,
  intent,
  children,
}: {
  href: string;
  title: string;
  intent: string;
  children?: ReactNode;
}) {
  const node = getNodeByHref(MTG_BUYLIST_HREF);

  return (
    <AppShell currentHref={href}>
      <PageNav href={MTG_BUYLIST_HREF} />
      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {node ? <CodeBadge node={node} /> : null}
          {node ? <StatusPill status={node.status} /> : null}
        </div>
        <p className="max-w-2xl text-[var(--muted)]">{intent}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          v{MTG_BUYLIST_VERSION} · {MTG_BUYLIST_VERSION_WHEN}
          {node
            ? ` · Access: ${node.accessMode.replace("_", " ")} · Path ${href} · Your run only`
            : ""}
        </p>
      </header>
      <MtgBuylistNav currentHref={href} />
      {children}
    </AppShell>
  );
}
