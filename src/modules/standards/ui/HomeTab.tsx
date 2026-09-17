import Link from "next/link";
import { STANDARDS_HREF, type StandardsDropRecord } from "../schema";
import { libraryNeedingDecision } from "../catalog";
import { DropList } from "./DropList";

const DOORS = [
  {
    href: `${STANDARDS_HREF}?tab=drop`,
    title: "Drop",
    body: "Pile for live notes from parallel desks. Decision, conflict, or leftover. Not a ticket.",
  },
  {
    href: `${STANDARDS_HREF}?tab=design`,
    title: "Design Library",
    body: "Named tokens, objects, and patterns. Kit default stays visible after you change it.",
  },
  {
    href: `${STANDARDS_HREF}?tab=behaviours`,
    title: "Behaviours",
    body: "Loading, tables, dialogs, empty states — how the hub should act, not only how it looks.",
  },
  {
    href: `${STANDARDS_HREF}?tab=process`,
    title: "Process",
    body: "Yard: desk, station, make it live. Spoken words for this hub.",
  },
  {
    href: `${STANDARDS_HREF}?tab=inbox`,
    title: "Development",
    body: "This leaf’s Kanban host. Design spec stays on the Development hub.",
  },
];

export function HomeTab({ drops }: { drops: StandardsDropRecord[] }) {
  const needs = libraryNeedingDecision();
  const conflicts = needs.filter((row) => row.status === "conflict").length;
  const gaps = needs.filter((row) => row.status === "gap").length;
  const recent = drops.slice(0, 5);

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-[var(--muted)]">
        This is the hub home for design and process standards. Agents pick named
        objects here instead of inventing a new button. Parallel sittings dump
        live notes on{" "}
        <Link href={`${STANDARDS_HREF}?tab=drop`} className="underline underline-offset-2">
          Drop
        </Link>
        . Chrome Feedback stays the bug door on Development Inbox.
      </p>

      <section aria-labelledby="doors-heading">
        <h2 id="doors-heading" className="mb-3 text-lg font-semibold">
          Doors
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {DOORS.map((door) => (
            <li key={door.href}>
              <Link href={door.href} className="sg-card block h-full no-underline">
                <p className="font-semibold text-[var(--ink)]">{door.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{door.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="queue-heading">
        <h2 id="queue-heading" className="mb-3 text-lg font-semibold">
          Needs a look
        </h2>
        <div className="sg-card">
          <p className="text-sm text-[var(--muted)]">
            Farmed from what is already built. Nothing here restyles MRT or
            Buylist until you decide.
          </p>
          <p className="mt-2 font-medium">
            {conflicts} conflict{conflicts === 1 ? "" : "s"} · {gaps} gap
            {gaps === 1 ? "" : "s"} · {drops.length} in the drop pile
          </p>
          <p className="mt-2 text-sm">
            <Link href={`${STANDARDS_HREF}?tab=design`} className="underline underline-offset-2">
              Open Design Library
            </Link>
            {" · "}
            <Link
              href={`${STANDARDS_HREF}?tab=behaviours`}
              className="underline underline-offset-2"
            >
              Open Behaviours
            </Link>
          </p>
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="mb-3 text-lg font-semibold">
          Latest drops
        </h2>
        {recent.length === 0 ? (
          <div className="sg-card">
            <p className="font-medium">Drop pile is empty</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Throw a note from another sitting, or{" "}
              <Link href={`${STANDARDS_HREF}?tab=drop`} className="underline underline-offset-2">
                open Drop
              </Link>
              .
            </p>
          </div>
        ) : (
          <DropList items={recent} />
        )}
      </section>
    </div>
  );
}
