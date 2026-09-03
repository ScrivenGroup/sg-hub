import Link from "next/link";
import { MTG_BUYLIST_HREF } from "../schema";

const LINKS = [
  { href: MTG_BUYLIST_HREF, label: "Run" },
  { href: `${MTG_BUYLIST_HREF}/development`, label: "Development" },
  { href: `${MTG_BUYLIST_HREF}/kanban`, label: "KanBan" },
] as const;

export function MtgBuylistNav({ currentHref }: { currentHref: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="MTG Buylist">
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
    </nav>
  );
}
