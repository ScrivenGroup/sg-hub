import type { ReactNode } from "react";
import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import type { DevHostKind } from "@/core/kanban/host";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { InfoTip } from "@/core/ui/InfoTip";
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
  wide,
  canRaise = true,
  hostKind,
  host,
}: {
  href: string;
  title: string;
  intent: string;
  children?: ReactNode;
  /** Fill the viewport (KanBan / Development). */
  wide?: boolean;
  canRaise?: boolean;
  hostKind?: DevHostKind;
  host?: string;
}) {
  const node = getNodeByHref(MTG_BUYLIST_HREF);
  const tip = [
    intent,
    `v${MTG_BUYLIST_VERSION} · ${MTG_BUYLIST_VERSION_WHEN}`,
    node ? `Access: ${node.accessMode.replace("_", " ")} · Path ${href} · Your run only` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AppShell
      currentHref={href}
      frameClassName={wide ? "h-dvh max-h-dvh overflow-hidden" : undefined}
      mainClassName={
        wide
          ? "flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 pb-3 pt-3"
          : "mx-auto max-w-5xl px-4 pb-8 pt-3"
      }
    >
      <div className="shrink-0">
        <PageNav href={MTG_BUYLIST_HREF} compact />
      </div>
      <header className="mb-1 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {node ? <CodeBadge node={node} /> : null}
          <span className="text-xs text-[var(--muted)]">
            v{MTG_BUYLIST_VERSION} · {MTG_BUYLIST_VERSION_WHEN}
          </span>
          <InfoTip label={tip} />
        </div>
      </header>
      <MtgBuylistNav
        currentHref={href}
        canRaise={canRaise}
        hostKind={hostKind}
        host={host}
      />
      <div className={wide ? "flex min-h-0 flex-1 flex-col" : undefined}>{children}</div>
    </AppShell>
  );
}
