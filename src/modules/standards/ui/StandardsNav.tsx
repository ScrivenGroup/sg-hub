import Link from "next/link";
import { STANDARDS_HREF, type StandardsMode } from "../schema";

const TABS: { mode: StandardsMode; href: string; label: string }[] = [
  { mode: "home", href: STANDARDS_HREF, label: "Home" },
  { mode: "drop", href: `${STANDARDS_HREF}?tab=drop`, label: "Drop" },
  { mode: "design", href: `${STANDARDS_HREF}?tab=design`, label: "Design Library" },
  { mode: "behaviours", href: `${STANDARDS_HREF}?tab=behaviours`, label: "Behaviours" },
  { mode: "process", href: `${STANDARDS_HREF}?tab=process`, label: "Process" },
  { mode: "development", href: `${STANDARDS_HREF}?tab=inbox`, label: "Development" },
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
          className="sg-tab"
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
