"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { DevHostKind } from "@/core/kanban/host";
import { RaiseIdeaButton } from "@/core/kanban/ui/RaiseIdeaButton";
import { DevHostStrip } from "@/core/kanban/ui/DevHostStrip";
import { kanbanLeafOptions } from "@/core/kanban/leaves";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { InfoTip } from "@/core/ui/InfoTip";
import { MTG_BUYLIST_HREF, MTG_BUYLIST_NODE_ID } from "../schema";
import {
  MTG_BUYLIST_VERSION,
  MTG_BUYLIST_VERSION_WHEN,
} from "../version";

const LINKS = [
  { href: MTG_BUYLIST_HREF, label: "Run", tab: "run" },
  { href: `${MTG_BUYLIST_HREF}/logs`, label: "Logs", tab: "logs" },
  { href: `${MTG_BUYLIST_HREF}/development`, label: "Development", tab: "development" },
] as const;

type LeafTab = (typeof LINKS)[number]["tab"];

const DEV_HREF = `${MTG_BUYLIST_HREF}/development`;
const INBOX_HREF = `${DEV_HREF}?tab=inbox`;

const LEAF_COPY: Record<
  LeafTab,
  { title: string; intent: string }
> = {
  run: {
    title: "MTG Buylist",
    intent:
      "Four cards on Run — Upload, Harvest, Picking, Reupload — with only the active step on screen. Shared ManaBox CSV, then isolated Playmantis and MTGMate streams. Compare (filters and exports) is available from the first harvested store — credit vs credit when both exist, Mate cash shown. This run is keyed to your login.",
  },
  logs: {
    title: "Logs",
    intent: "Your harvest vs Import Review diffs, plus archived runs. Not shared with other logins.",
  },
  development: {
    title: "Development",
    intent:
      "Release table, WIP plan, staff notes, Inbox, and a KanBan snapshot. Notes are per login until Neon. Inbox and KanBan share one leaf board.",
  },
};

function leafTabFromPath(pathname: string): LeafTab {
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
  const copy = LEAF_COPY[tab];
  const node = getNodeByHref(MTG_BUYLIST_HREF);
  const tip = [
    copy.intent,
    `v${MTG_BUYLIST_VERSION} · ${MTG_BUYLIST_VERSION_WHEN}`,
    node
      ? `Access: ${node.accessMode.replace("_", " ")} · Path ${pathname} · Your run only`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header className="mb-1 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">{copy.title}</h1>
          {node ? <CodeBadge node={node} /> : null}
          <span className="text-xs text-[var(--muted)]">
            v{MTG_BUYLIST_VERSION} · {MTG_BUYLIST_VERSION_WHEN}
          </span>
          <InfoTip label={tip} />
        </div>
      </header>
      <MtgBuylistNav
        canRaise={canRaise}
        hostKind={hostKind}
        host={host}
        currentTab={tab}
      />
      <div
        className={
          tab === "development"
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "min-h-0 flex-1 overflow-y-auto"
        }
      >
        {children}
      </div>
    </>
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
      className="mb-2 flex shrink-0 flex-wrap items-center gap-2"
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
