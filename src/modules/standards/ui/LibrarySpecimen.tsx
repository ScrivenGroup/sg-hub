"use client";

import { CodeBadge } from "@/core/ui/CodeBadge";
import { InfoTip } from "@/core/ui/InfoTip";
import { StatusPill } from "@/core/ui/StatusPill";
import { getNodeByHref } from "@/core/registry";
import type { LibraryEntry } from "../catalog";
import { STANDARDS_HREF } from "../schema";
import {
  ColorPlay,
  HeightPlay,
  RadiusPlay,
  Stage,
} from "./specimen-stage";

const COLORS: Record<string, { cssVar: string; hex: string; role: string }> = {
  "tok-ink": { cssVar: "--ink", hex: "#3C3C3B", role: "Text and primary fill" },
  "tok-page": { cssVar: "--page", hex: "#F5F5F4", role: "Page ground behind cards" },
  "tok-surface": { cssVar: "--surface", hex: "#FFFFFF", role: "Cards, chrome, inputs" },
  "tok-surface-muted": { cssVar: "--surface-muted", hex: "#ECECEC", role: "Hover wash and pill fill" },
  "tok-border": { cssVar: "--border", hex: "#D4D4D2", role: "Hairlines" },
  "tok-muted": { cssVar: "--muted", hex: "#6B6B69", role: "Secondary text" },
};

export function FoundationsBoard({
  primaryBordered = false,
}: {
  primaryBordered?: boolean;
}) {
  return (
    <section
      className="space-y-5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5"
      aria-labelledby="foundations-board"
    >
      <div>
        <h2 id="foundations-board" className="text-lg font-semibold">
          The kit
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Already locked. Not a picker. Page fills the frame; reading text stays
          narrow.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          ["#3C3C3B", "Ink"],
          ["#F5F5F4", "Page"],
          ["#FFFFFF", "Surface"],
          ["#ECECEC", "Muted fill"],
          ["#D4D4D2", "Border"],
          ["#6B6B69", "Muted text"],
          ["#2F8F4E", "Green"],
          ["#D4A017", "Amber"],
          ["#C0392B", "Red"],
        ].map(([hex, label]) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span
              className="h-6 w-6 shrink-0 border border-[var(--border)]"
              style={{ backgroundColor: hex, borderRadius: 6 }}
              title={hex}
            />
            {label}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="sg-btn-primary"
          style={primaryBordered ? { border: "1px solid var(--ink)" } : undefined}
        >
          Primary
        </button>
        <button type="button" className="sg-btn-secondary">
          Secondary
        </button>
        <button type="button" className="sg-btn-ghost">
          Ghost
        </button>
        <input className="sg-input max-w-[10rem]" defaultValue="Input" readOnly />
      </div>
      <div className="flex gap-1 border-b border-[var(--border)]">
        <span className="sg-tab" aria-selected>
          Selected
        </span>
        <span className="sg-tab">Idle</span>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Radius 10px · control height 32px · RAG dots on amber and red only.
      </p>
    </section>
  );
}

export function LibrarySpecimen({ row }: { row: LibraryEntry }) {
  const color = COLORS[row.id];
  if (color) {
    return <ColorPlay cssVar={color.cssVar} hex={color.hex} role={color.role} />;
  }

  switch (row.id) {
    case "tok-rag":
      return <RagSpecimen />;
    case "tok-radius":
      return <RadiusPlay />;
    case "tok-control-height":
      return <HeightPlay />;
    case "tok-type":
      return <TypeSpecimen />;
    case "tok-elevation":
      return <ElevationSpecimen />;
    case "tok-icon":
      return <IconSpecimen />;
    case "tok-focus":
      return <FocusSpecimen />;
    case "tok-motion":
      return <MotionSpecimen />;
    case "obj-btn-primary":
    case "obj-btn-secondary":
    case "obj-btn-ghost":
    case "obj-btn-action":
      return <ButtonSpecimen />;
    case "obj-btn-destructive":
      return <DangerSpecimen />;
    case "obj-input":
      return <InputSpecimen />;
    case "obj-card":
      return <CardSpecimen />;
    case "obj-tab":
      return <TabSpecimen />;
    case "obj-badge":
      return <BadgeSpecimen />;
    case "obj-status-pill":
      return (
        <Stage label="Leaf cycle — not RAG">
          <div className="flex flex-wrap gap-2">
            <StatusPill status="sketched" />
            <StatusPill status="building" />
            <StatusPill status="live" />
          </div>
        </Stage>
      );
    case "obj-rag":
      return <RagSpecimen />;
    case "obj-info":
      return (
        <Stage label="Hover the i">
          <p className="flex items-center gap-2 text-sm">
            Hours
            <InfoTip label="Planned hours for this occurrence." />
          </p>
        </Stage>
      );
    case "obj-skip":
      return (
        <Stage label="Visible stand-in (real skip sits off-screen until Tab)">
          <a className="sg-skip !static !left-auto !top-auto" href="#main">
            Skip to content
          </a>
        </Stage>
      );
    case "obj-link":
      return (
        <Stage>
          <p className="text-sm">
            In-page{" "}
            <a href="#objects" className="underline underline-offset-2">
              text link
            </a>
            . Not a chip.
          </p>
        </Stage>
      );
    case "obj-chip":
      return (
        <Stage label="MRT type-link today — not in the kit">
          <span className="inline-flex min-h-7 items-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 text-[13px] font-semibold">
            Obligation type
          </span>
        </Stage>
      );
    case "obj-seg":
      return <SegSpecimen />;
    case "obj-check":
      return (
        <Stage>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked /> Native checkbox
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="radio" name="lib-radio" defaultChecked /> Native radio
          </label>
        </Stage>
      );
    case "obj-banner":
      return (
        <Stage>
          <div className="sg-card border-[var(--rag-red)] text-sm" role="alert">
            Could not load the CSV. Stay on this page.
          </div>
        </Stage>
      );
    case "obj-toast":
      return (
        <Stage label="Not in the kit — mock only">
          <div className="ml-auto max-w-xs rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm shadow-xl">
            Saved notes.
          </div>
        </Stage>
      );
    case "obj-dialog":
      return <DialogSpecimen />;
    case "obj-table":
      return <TableSpecimen />;
    case "pat-page-header":
      return <PageHeaderSpecimen />;
    case "pat-leaf-tabs":
      return <TabSpecimen />;
    case "pat-form":
      return <InputSpecimen />;
    case "pat-empty":
      return (
        <Stage>
          <p className="font-medium">No obligation types yet.</p>
          <p className="text-sm text-[var(--muted)]">Keep the page chrome. One sentence.</p>
        </Stage>
      );
    case "pat-loading":
    case "beh-page-loading":
      return <LoadingSpecimen />;
    case "beh-pending":
      return (
        <Stage>
          <button type="button" className="sg-btn-primary opacity-50" disabled>
            Saving…
          </button>
        </Stage>
      );
    case "beh-empty":
      return (
        <Stage>
          <p className="text-sm text-[var(--muted)]">No version rows yet.</p>
        </Stage>
      );
    case "beh-errors":
      return (
        <Stage>
          <label className="block max-w-sm text-sm font-medium">
            Layer
            <input className="sg-input mt-1" defaultValue="" readOnly />
            <span className="mt-1 block text-sm text-[var(--rag-red)]">Layer required</span>
          </label>
        </Stage>
      );
    case "beh-dialogs":
      return <DialogSpecimen />;
    case "beh-tables":
      return <TableSpecimen />;
    case "beh-destructive":
      return <DangerSpecimen />;
    case "beh-unsaved":
      return (
        <Stage>
          <textarea className="sg-input min-h-20" defaultValue="Draft notes…" readOnly />
          <button type="button" className="sg-btn-primary mt-2">
            Save notes
          </button>
        </Stage>
      );
    case "beh-a11y":
      return <FocusSpecimen />;
    case "beh-disabled-vs-hidden":
      return (
        <Stage>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="mb-1 text-xs text-[var(--muted)]">In-flight</p>
              <button type="button" className="sg-btn-primary opacity-50" disabled>
                Drop
              </button>
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--muted)]">Read-only</p>
              <input className="sg-input max-w-[8rem]" defaultValue="Locked" disabled />
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--muted)]">Guest — hidden</p>
              <p className="text-[var(--muted)]">(Feedback / Development not shown)</p>
            </div>
          </div>
        </Stage>
      );
    case "beh-hover":
      return <CardSpecimen />;
    case "beh-copy":
      return (
        <Stage>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="sg-btn-primary">
              Save
            </button>
            <button type="button" className="sg-btn-ghost">
              Cancel
            </button>
            <button type="button" className="sg-btn-secondary">
              Add
            </button>
          </div>
        </Stage>
      );
    default:
      return (
        <Stage label="No live object yet">
          <div className="flex h-20 items-center justify-center rounded-[10px] border border-dashed border-[var(--border)] text-sm text-[var(--muted)]">
            Gap — nothing to render from the kit
          </div>
        </Stage>
      );
  }
}

function RagSpecimen() {
  const cells = [
    { label: "Green", hex: "#2F8F4E", job: "Host OK — RagDot hides this" },
    { label: "Amber", hex: "#D4A017", job: "Attention" },
    { label: "Red", hex: "#C0392B", job: "Critical / expired" },
  ];
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {cells.map((c) => (
          <div key={c.label} className="space-y-1">
            <div
              className="h-20 border border-[var(--border)]"
              style={{ backgroundColor: c.hex, borderRadius: 10 }}
            />
            <p className="text-sm font-medium">{c.label}</p>
            <p className="font-mono text-xs text-[var(--muted)]">{c.hex}</p>
            <p className="text-xs text-[var(--muted)]">{c.job}</p>
          </div>
        ))}
      </div>
      <Stage label="Status list (how RagDot behaves)">
        <ul className="space-y-2 text-sm">
          <li>Azure App Service — no dot (green is omitted)</li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--rag-amber)]" />
            Entra secret — amber
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--rag-red)]" />
            Expired cert — red
          </li>
        </ul>
      </Stage>
      <Stage label="Allowed exception — data wash, not a button">
        <div className="flex gap-1">
          {["#2F8F4E", "#D4A017", "#C0392B"].map((hex) => (
            <span
              key={hex}
              className="h-8 flex-1"
              style={{ backgroundColor: `color-mix(in srgb, ${hex} 22%, transparent)` }}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Do not use these as Submit / Primary. Heatmap and Gantt today-line only.
        </p>
      </Stage>
    </div>
  );
}

function TypeSpecimen() {
  return (
    <Stage>
      <p className="text-3xl font-semibold tracking-tight">Page title</p>
      <p className="mt-2">Body at 16px-ish on Manrope. Line height comfortable for docs.</p>
      <p className="text-sm text-[var(--muted)]">Muted helper under a field or header.</p>
      <p className="mt-2 font-mono text-xs">sg-btn-primary · --ink</p>
      <button type="button" className="sg-btn-primary mt-2">
        Control font 13px
      </button>
    </Stage>
  );
}

function ElevationSpecimen() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Stage label="Cards — no shadow">
        <div className="sg-card">Kit card</div>
      </Stage>
      <Stage label="ShellModal today — shadow-xl">
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
          Dialog panel
        </div>
      </Stage>
    </div>
  );
}

function IconSpecimen() {
  return (
    <Stage>
      <p className="flex items-center gap-2 text-sm">
        No icon set.
        <InfoTip label="This letter is the only glyph we ship." />
      </p>
    </Stage>
  );
}

function FocusSpecimen() {
  return (
    <Stage label="Tab into the control — kit has no custom ring yet">
      <button type="button" className="sg-btn-secondary">
        Focus me
      </button>
      <span
        className="ml-3 inline-flex min-h-8 items-center rounded-[10px] border-2 border-[var(--ink)] px-3 text-sm"
        style={{ outline: "2px solid var(--ink)", outlineOffset: 2 }}
      >
        Suggested 2px ink ring
      </span>
    </Stage>
  );
}

function MotionSpecimen() {
  return (
    <Stage label="Hover the card — 0.15s border">
      <div className="sg-card max-w-xs">Hover me</div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        prefers-reduced-motion in globals.css cuts this to ~0.
      </p>
    </Stage>
  );
}

function ButtonSpecimen() {
  return (
    <div className="space-y-4">
      <Stage label="Kit — default / disabled">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="sg-btn-primary">
            Primary
          </button>
          <button type="button" className="sg-btn-secondary">
            Secondary
          </button>
          <button type="button" className="sg-btn-ghost">
            Ghost
          </button>
          <button type="button" className="sg-btn-action">
            Action
          </button>
          <button type="button" className="sg-btn-primary opacity-50" disabled>
            Disabled
          </button>
        </div>
      </Stage>
      <Stage label="Border decision — same label, three paints">
        <div className="flex flex-wrap gap-6">
          <div className="space-y-1">
            <button type="button" className="sg-btn-primary">
              Save
            </button>
            <p className="text-xs text-[var(--muted)]">Kit · fill, no border</p>
          </div>
          <div className="space-y-1">
            <button
              type="button"
              className="sg-btn-primary"
              style={{ border: "1px solid var(--ink)" }}
            >
              Save
            </button>
            <p className="text-xs text-[var(--muted)]">Trial A · 1px ink border</p>
          </div>
          <div className="space-y-1">
            <button
              type="button"
              className="inline-flex min-h-8 items-center rounded-[8px] border border-[var(--ink)] bg-[var(--ink)] px-3 text-[12.5px] font-semibold text-[var(--surface)]"
            >
              Save
            </button>
            <p className="text-xs text-[var(--muted)]">MRT today · 8px + border</p>
          </div>
        </div>
      </Stage>
    </div>
  );
}

function DangerSpecimen() {
  return (
    <Stage label="Not in the kit — two inventions today">
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <button
            type="button"
            className="inline-flex min-h-8 items-center rounded-[10px] border border-[color-mix(in_srgb,var(--rag-red)_40%,var(--border))] bg-[color-mix(in_srgb,var(--rag-red)_22%,var(--surface))] px-3 text-sm font-semibold text-[var(--rag-red)]"
          >
            Remove
          </button>
          <p className="text-xs text-[var(--muted)]">MRT mrt-btn-remove</p>
        </div>
        <div className="space-y-1">
          <button
            type="button"
            className="inline-flex min-h-8 items-center rounded-[10px] border border-[var(--rag-red)] bg-[color-mix(in_srgb,var(--rag-red)_12%,var(--surface))] px-3 text-xs font-semibold text-[var(--rag-red)]"
          >
            Delete
          </button>
          <p className="text-xs text-[var(--muted)]">Buylist one-off</p>
        </div>
      </div>
    </Stage>
  );
}

function InputSpecimen() {
  return (
    <Stage>
      <form className="max-w-sm space-y-3" onSubmit={(e) => e.preventDefault()}>
        <label className="block text-sm font-medium">
          Name
          <input className="sg-input mt-1" placeholder="Scriven Owner" />
        </label>
        <label className="block text-sm font-medium">
          Layer
          <select className="sg-input mt-1" defaultValue="design">
            <option value="design">design</option>
            <option value="leaf">leaf</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Notes
          <textarea className="sg-input mt-1 min-h-16 py-2" defaultValue="" />
        </label>
        <p className="text-sm text-[var(--rag-red)]">Error sits under the field.</p>
      </form>
    </Stage>
  );
}

function CardSpecimen() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Stage label="sg-card — hover the border">
        <div className="sg-card">Interactive door</div>
      </Stage>
      <Stage label="Suggested static — no hover (mock)">
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5">
          Quiet block
        </div>
      </Stage>
    </div>
  );
}

function TabSpecimen() {
  return (
    <Stage>
      <div className="flex gap-1 border-b border-[var(--border)]">
        <span className="sg-tab" aria-selected>
          Home
        </span>
        <span className="sg-tab">Drop</span>
        <span className="sg-tab">Design Library</span>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        MRT SubTabs is the same idea at 36px, without the sg-tab class.
      </p>
    </Stage>
  );
}

function BadgeSpecimen() {
  const node = getNodeByHref(STANDARDS_HREF);
  if (!node) return null;
  return (
    <Stage label="Leaf hex on the badge only">
      <CodeBadge node={node} />
    </Stage>
  );
}

function PageHeaderSpecimen() {
  const node = getNodeByHref(STANDARDS_HREF);
  return (
    <Stage>
      <p className="text-xs text-[var(--muted)]">← Back · System / Standards</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-3xl font-semibold tracking-tight">Standards</p>
        {node ? <CodeBadge node={node} /> : null}
        <StatusPill status="building" />
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">Muted description under the title.</p>
    </Stage>
  );
}

function SegSpecimen() {
  return (
    <Stage label="Kanban LAYOUT today">
      <div className="inline-flex overflow-hidden rounded-[10px] border border-[var(--border)]">
        <span className="bg-[var(--surface)] px-2.5 py-1 text-xs font-medium">Columns</span>
        <span className="bg-[var(--page)] px-2.5 py-1 text-xs text-[var(--muted)]">Swimlanes</span>
      </div>
    </Stage>
  );
}

function DialogSpecimen() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Stage label="PLATFORM / EffortPopupShell">
        <div className="grid h-40 grid-rows-[1fr] overflow-hidden bg-black/40 p-2">
          <div className="mx-auto flex max-h-full w-4/5 flex-col overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
            <div className="shrink-0 border-b border-[var(--border)] px-2 py-1 text-xs font-medium">
              Header
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2 text-xs text-[var(--muted)]">
              Scrollport. Footer stays.
              <p className="mt-8">More content.</p>
            </div>
            <div className="shrink-0 border-t border-[var(--border)] px-2 py-1">
              <button type="button" className="sg-btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      </Stage>
      <Stage label="ShellModal today — centred, overlay scroll">
        <div className="flex h-40 items-center justify-center overflow-y-auto bg-black/40 p-2">
          <div className="w-4/5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 text-xs shadow-xl">
            Panel grows with content.
          </div>
        </div>
      </Stage>
    </div>
  );
}

function TableSpecimen() {
  return (
    <Stage>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <thead>
            <tr className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              <th className="py-1.5 pr-3">Dam</th>
              <th className="py-1.5 pr-3">Type</th>
              <th className="py-1.5 text-right tabular-nums">Hours</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[var(--border)]">
              <td className="py-1.5 pr-3">Fairbairn</td>
              <td className="py-1.5 pr-3">Annual</td>
              <td className="py-1.5 text-right tabular-nums">12.0</td>
            </tr>
            <tr className="border-t border-[var(--border)]">
              <td className="py-1.5 pr-3">Burdekin</td>
              <td className="py-1.5 pr-3">5 year</td>
              <td className="py-1.5 text-right tabular-nums">40.5</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Stage>
  );
}

function LoadingSpecimen() {
  return (
    <Stage>
      <div className="h-6 w-40 animate-pulse rounded bg-[var(--surface-muted)]" />
      <p className="mt-2 text-sm text-[var(--muted)]">Loading…</p>
      <div className="mt-2 space-y-2">
        <div className="sg-card h-16 animate-pulse" />
        <div className="sg-card h-16 animate-pulse" />
      </div>
    </Stage>
  );
}
