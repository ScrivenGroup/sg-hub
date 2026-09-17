import Link from "next/link";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { InfoTip } from "@/core/ui/InfoTip";
import { RagDot } from "@/core/ui/RagDot";
import { StatusPill } from "@/core/ui/StatusPill";
import { getNodeByHref } from "@/core/registry";
import {
  libraryByLayer,
  libraryNeedingDecision,
  type LibraryEntry,
} from "../catalog";
import { STANDARDS_HREF } from "../schema";
import { LibraryEntryCard } from "./LibraryEntryCard";

const TOC = [
  { id: "needs", label: "Needs a decision" },
  { id: "foundations", label: "Foundations" },
  { id: "objects", label: "Objects" },
  { id: "patterns", label: "Patterns" },
];

function specimenFor(row: LibraryEntry) {
  if (row.id === "obj-btn-primary") {
    return <button type="button" className="sg-btn-primary">Primary</button>;
  }
  if (row.id === "obj-btn-secondary") {
    return <button type="button" className="sg-btn-secondary">Secondary</button>;
  }
  if (row.id === "obj-btn-ghost") {
    return <button type="button" className="sg-btn-ghost">Ghost</button>;
  }
  if (row.id === "obj-input") {
    return <input className="sg-input max-w-xs" defaultValue="sg-input" readOnly />;
  }
  if (row.id === "obj-card") {
    return <span className="text-sm text-[var(--muted)]">This card is the specimen.</span>;
  }
  if (row.id === "obj-tab") {
    return (
      <span className="flex gap-1">
        <span className="sg-tab" aria-selected>
          Selected
        </span>
        <span className="sg-tab">Idle</span>
      </span>
    );
  }
  if (row.id === "obj-badge") {
    const node = getNodeByHref(STANDARDS_HREF);
    return node ? <CodeBadge node={node} /> : null;
  }
  if (row.id === "obj-status-pill") {
    return (
      <>
        <StatusPill status="sketched" />
        <StatusPill status="building" />
        <StatusPill status="live" />
      </>
    );
  }
  if (row.id === "obj-rag") {
    return (
      <>
        <RagDot level="amber" />
        <RagDot level="red" />
      </>
    );
  }
  if (row.id === "obj-info") {
    return <InfoTip label="Native title. Keep copy off the page." />;
  }
  if (row.id === "tok-ink" || row.id === "tok-page" || row.id === "tok-surface" || row.id === "tok-border" || row.id === "tok-muted" || row.id === "tok-surface-muted") {
    const name = row.use;
    return (
      <span
        className="h-8 w-8 rounded-md border border-[var(--border)]"
        style={{ backgroundColor: `var(${name})` }}
        title={name}
      />
    );
  }
  return null;
}

export function DesignLibraryTab() {
  const needs = libraryNeedingDecision().filter((row) => row.layer !== "behaviour");
  const tokens = libraryByLayer("token");
  const objects = libraryByLayer("object");
  const patterns = libraryByLayer("pattern");

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-[var(--muted)]">
        Named kit for hub UI. Agents use the <code className="font-mono text-xs">use</code>{" "}
        name, not a new colour. Kit default stays on the card after a PM decision
        so you can see what we left. Foundations live in CSS;{" "}
        <Link href="/s/appearance" className="underline underline-offset-2">
          Appearance
        </Link>{" "}
        is the token viewer. Throw live notes on{" "}
        <Link href={`${STANDARDS_HREF}?tab=drop`} className="underline underline-offset-2">
          Drop
        </Link>
        .
      </p>
      <nav aria-label="Library sections" className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {TOC.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="text-[var(--muted)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <section aria-labelledby="needs" className="space-y-3">
        <h2 id="needs" className="text-lg font-semibold">
          Needs a decision
        </h2>
        {needs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No farmed conflicts or gaps.</p>
        ) : (
          needs.map((row) => (
            <LibraryEntryCard key={row.id} row={row} specimen={specimenFor(row)} anchor={false} />
          ))
        )}
      </section>

      <section aria-labelledby="foundations" className="space-y-3">
        <h2 id="foundations" className="text-lg font-semibold">
          Foundations
        </h2>
        {tokens.map((row) => (
          <LibraryEntryCard key={row.id} row={row} specimen={specimenFor(row)} />
        ))}
      </section>

      <section aria-labelledby="objects" className="space-y-3">
        <h2 id="objects" className="text-lg font-semibold">
          Objects
        </h2>
        {objects.map((row) => (
          <LibraryEntryCard key={row.id} row={row} specimen={specimenFor(row)} />
        ))}
      </section>

      <section aria-labelledby="patterns" className="space-y-3">
        <h2 id="patterns" className="text-lg font-semibold">
          Patterns
        </h2>
        {patterns.map((row) => (
          <LibraryEntryCard key={row.id} row={row} specimen={specimenFor(row)} />
        ))}
      </section>
    </div>
  );
}
