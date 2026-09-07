"use client";

import Link from "next/link";
import type { DevHostKind } from "@/core/kanban/host";
import { RaiseIdeaButton } from "@/core/kanban/ui/RaiseIdeaButton";
import { DevHostStrip } from "@/core/kanban/ui/DevHostStrip";
import { kanbanLeafOptions } from "@/core/kanban/leaves";
import { MTG_BUYLIST_HREF, MTG_BUYLIST_NODE_ID } from "../schema";

const LINKS = [
  { href: MTG_BUYLIST_HREF, label: "Run" },
  { href: `${MTG_BUYLIST_HREF}/development`, label: "Development" },
] as const;

const DEV_HREF = `${MTG_BUYLIST_HREF}/development`;
const INBOX_HREF = `${DEV_HREF}?tab=inbox`;

export function MtgBuylistNav({
  currentHref,
  canRaise = true,
  hostKind,
  host,
}: {
  currentHref: string;
  canRaise?: boolean;
  hostKind?: DevHostKind;
  host?: string;
}) {
  return (
    <nav
      className="mb-2 flex shrink-0 flex-wrap items-center gap-2"
      aria-label="MTG Buylist"
    >
      <div role="tablist" className="flex min-w-0 flex-wrap items-center">
        {LINKS.map((link) => {
          const current = currentHref === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              role="tab"
              className="sg-tab"
              aria-selected={current}
              aria-current={current ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
        {hostKind ? <DevHostStrip kind={hostKind} host={host || ""} compact /> : null}
        {canRaise ? (
          <RaiseIdeaButton
            nodeId={MTG_BUYLIST_NODE_ID}
            revalidateHref={DEV_HREF}
            inboxHref={INBOX_HREF}
            leafOptions={kanbanLeafOptions()}
            defaultTagNodeId={MTG_BUYLIST_NODE_ID}
          />
        ) : null}
      </div>
    </nav>
  );
}
