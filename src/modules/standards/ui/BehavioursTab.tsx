import Link from "next/link";
import { libraryByLayer, libraryNeedingDecision } from "../catalog";
import { STANDARDS_HREF } from "../schema";
import { LibraryEntryCard } from "./LibraryEntryCard";

export function BehavioursTab() {
  const rows = libraryByLayer("behaviour");
  const needs = libraryNeedingDecision().filter((row) => row.layer === "behaviour");

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-[var(--muted)]">
        How pages should act. Same catalog as Design Library, layer{" "}
        <code className="font-mono text-xs">behaviour</code>. Drop a live note
        from another sitting rather than quietly inventing a new rule.
      </p>

      <section aria-labelledby="beh-needs" className="space-y-3">
        <h2 id="beh-needs" className="text-lg font-semibold">
          Needs a decision
        </h2>
        {needs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No farmed behaviour conflicts or gaps.</p>
        ) : (
          needs.map((row) => <LibraryEntryCard key={row.id} row={row} anchor={false} />)
        )}
      </section>

      <section aria-labelledby="beh-all" className="space-y-3">
        <h2 id="beh-all" className="text-lg font-semibold">
          Catalogue
        </h2>
        {rows.map((row) => (
          <LibraryEntryCard key={row.id} row={row} />
        ))}
      </section>

      <p className="text-sm text-[var(--muted)]">
        Visual objects live on{" "}
        <Link href={`${STANDARDS_HREF}?tab=design`} className="underline underline-offset-2">
          Design Library
        </Link>
        . Process / yard is{" "}
        <Link href={`${STANDARDS_HREF}?tab=process`} className="underline underline-offset-2">
          Process
        </Link>
        .
      </p>
    </div>
  );
}
