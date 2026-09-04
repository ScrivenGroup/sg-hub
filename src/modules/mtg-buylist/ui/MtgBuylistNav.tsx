"use client";

import Link from "next/link";
import { RaiseIdeaButton } from "@/core/kanban/ui/RaiseIdeaButton";
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
}: {
  currentHref: string;
  canRaise?: boolean;
}) {
  return (
    <nav className="mb-4 flex shrink-0 flex-wrap items-center gap-2" aria-label="MTG Buylist">
      {LINKS.map((link) => {
        const current = currentHref === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={current ? "sg-btn-primary" : "sg-btn-secondary"}
            aria-current={current ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
      {canRaise ? (
        <RaiseIdeaButton
          nodeId={MTG_BUYLIST_NODE_ID}
          revalidateHref={DEV_HREF}
          inboxHref={INBOX_HREF}
        />
      ) : null}
    </nav>
  );
}
