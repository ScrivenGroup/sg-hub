import Link from "next/link";
import { STANDARDS_HREF, type StandardsMode } from "../schema";

const TABS: { mode: StandardsMode; href: string; label: string; prefetch?: boolean }[] = [
  { mode: "home", href: STANDARDS_HREF, label: "Home" },
  { mode: "design", href: `${STANDARDS_HREF}?tab=design`, label: "Design Library" },
  { mode: "behaviours", href: `${STANDARDS_HREF}?tab=behaviours`, label: "Behaviours" },
  { mode: "process", href: `${STANDARDS_HREF}?tab=process`, label: "Process" },
  { mode: "development", href: `${STANDARDS_HREF}?tab=inbox`, label: "Development", prefetch: true },
];

export function StandardsNav({ mode }: { mode: StandardsMode }) {
  return (
    <div role="tablist" aria-label="Standards" className="flex flex-wrap gap-1">
      {TABS.map((tab) => (
        <Link
          key={tab.mode}
          href={tab.href}
          role="tab"
          aria-selected={mode === tab.mode}
          prefetch={tab.prefetch}
          className="sg-tab"
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
