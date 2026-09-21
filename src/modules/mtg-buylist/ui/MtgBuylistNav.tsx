"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { DevHostKind } from "@/core/kanban/host";
import { RaiseIdeaButton } from "@/core/kanban/ui/RaiseIdeaButton";
import { DevHostStrip } from "@/core/kanban/ui/DevHostStrip";
import { kanbanLeafOptions } from "@/core/kanban/leaves";
import { MTG_BUYLIST_HREF, MTG_BUYLIST_NODE_ID } from "../schema";

const LINKS = [
  { href: MTG_BUYLIST_HREF, label: "Run", tab: "run" },
  { href: `${MTG_BUYLIST_HREF}/decks`, label: "Decks", tab: "decks" },
  { href: `${MTG_BUYLIST_HREF}/logs`, label: "Logs", tab: "logs" },
  { href: `${MTG_BUYLIST_HREF}/development`, label: "Development", tab: "development" },
] as const;

type LeafTab = (typeof LINKS)[number]["tab"];

const DEV_HREF = `${MTG_BUYLIST_HREF}/development`;
const INBOX_HREF = `${DEV_HREF}?tab=inbox`;

function leafTabFromPath(pathname: string): LeafTab {
  if (pathname === `${MTG_BUYLIST_HREF}/decks` || pathname.startsWith(`${MTG_BUYLIST_HREF}/decks/`)) {
    return "decks";
  }
  if (pathname === `${MTG_BUYLIST_HREF}/logs` || pathname.startsWith(`${MTG_BUYLIST_HREF}/logs/`)) {
    return "logs";
  }
  if (
    pathname === DEV_HREF ||
    pathname.startsWith(`${DEV_HREF}/`) ||
    pathname === `${MTG_BUYLIST_HREF}/kanban` ||
    pathname.startsWith(`${MTG_BUYLIST_HREF}/kanban/`)
  ) {
    return "development";
  }
  return "run";
}

export function MtgBuylistLeafBody({
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
  const pathname = usePathname() || MTG_BUYLIST_HREF;
  const tab = leafTabFromPath(pathname);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MtgBuylistNav
        canRaise={canRaise}
        hostKind={hostKind}
        host={host}
        currentTab={tab}
      />
      <div
        className={
          tab === "development" || tab === "decks"
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "min-h-0 flex-1 overflow-y-auto"
        }
      >
        {children}
      </div>
    </div>
  );
}

export function MtgBuylistNav({
  canRaise = true,
  hostKind,
  host,
  currentTab,
}: {
  canRaise?: boolean;
  hostKind?: DevHostKind;
  host?: string;
  currentTab?: LeafTab;
}) {
  const pathname = usePathname() || MTG_BUYLIST_HREF;
  const router = useRouter();
  const tab = currentTab ?? leafTabFromPath(pathname);

  return (
    <nav
      className="mb-1 flex shrink-0 flex-wrap items-center gap-2"
      aria-label="MTG Buylist"
    >
      <div role="tablist" className="flex min-w-0 flex-wrap items-center">
        {LINKS.map((link) => {
          const current = tab === link.tab;
          return (
            <button
              key={link.href}
              type="button"
              role="tab"
              className="sg-tab"
              aria-selected={current}
              aria-current={current ? "page" : undefined}
              onClick={() => {
                if (current) return;
                router.replace(link.href, { scroll: false });
              }}
            >
              {link.label}
            </button>
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
