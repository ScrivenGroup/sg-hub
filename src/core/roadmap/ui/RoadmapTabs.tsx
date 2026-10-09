import Link from "next/link";
import { KANBAN_CHROME } from "@/core/kanban/chrome";
import {
  roadmapLeafLevel,
  roadmapTabHref,
  type RoadmapDevTab,
  type RoadmapLeafTab,
} from "../tabs";

const LEVELS = [
  { id: "v1", label: "Roadmap (v1)", href: roadmapTabHref("v1") },
  { id: "v2", label: "Roadmap (v2)", href: roadmapTabHref("v2") },
  { id: "development", label: "Development", href: roadmapTabHref("requirements") },
] as const;

const DEV_TABS: { id: RoadmapDevTab; label: string }[] = [
  { id: "requirements", label: "Requirements" },
  { id: "inbox", label: KANBAN_CHROME.labels.inbox },
  { id: "kanban", label: KANBAN_CHROME.labels.kanban },
  { id: "changelog", label: KANBAN_CHROME.labels.changelog },
  { id: "notes", label: KANBAN_CHROME.labels.notes },
];

export function RoadmapTabs({ tab }: { tab: RoadmapLeafTab }) {
  const level = roadmapLeafLevel(tab);

  return (
    <div className="mb-1 flex shrink-0 flex-col gap-1">
      <div role="tablist" aria-label="Roadmap" className="flex flex-wrap gap-1">
        {LEVELS.map((item) => {
          const selected = level === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              role="tab"
              aria-selected={selected}
              className="sg-tab"
              scroll={false}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      {level === "development" ? (
        <div role="tablist" aria-label="Development" className="flex flex-wrap gap-1">
          {DEV_TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <Link
                key={item.id}
                href={roadmapTabHref(item.id)}
                role="tab"
                aria-selected={selected}
                className="sg-tab"
                scroll={false}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
