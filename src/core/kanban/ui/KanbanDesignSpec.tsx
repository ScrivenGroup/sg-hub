import type { ReactNode } from "react";
import { KANBAN_CHROME } from "../chrome";
import {
  CATEGORY_BADGE,
  CATEGORY_LABELS,
  COLUMN_ACCENT,
  COLUMN_LABELS,
  KANBAN_CATEGORIES,
} from "../schema";

/** Development template contract. Same host on `/d` and every leaf Development tab. */
export function KanbanDesignSpec() {
  const c = KANBAN_CHROME;
  return (
    <section className="min-h-0 flex-1 overflow-y-auto pb-8">
      <article className="mx-auto max-w-4xl space-y-6 text-sm">
        <header className="sg-card space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Kanban Online · template contract
          </p>
          <h2 className="text-xl font-semibold tracking-tight">{c.labels.designSpec}</h2>
          <p className="text-[var(--muted)]">
            This is the specification for the Development template. Layout 1 is the Development
            hub at <code className="font-mono text-xs">/d</code> (cards). Layout 2 is a leaf
            Development tab: Inbox, Kanban, Changelog (this leaf), Notes. This document lives
            on the Development Design Spec card, not on product leaves.
          </p>
          <p className="text-[var(--muted)]">
            Relabel in <code className="font-mono text-xs">src/core/kanban/chrome.ts</code>.
            Do not fork copy, colours, or chrome in a leaf. Extra product tools (Buylist
            Testing, MRT Gantt) sit beside the host, not inside a second inbox.
          </p>
          <nav aria-label="Spec sections" className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {TOC.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="text-[var(--muted)] underline-offset-2 hover:text-[var(--ink)] hover:underline">
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <SpecSection id="jobs" title="1. Jobs this template does">
          <p>
            Staff capture work while they are looking at a leaf, then turn that capture into
            tickets, a version history, and a scratchpad. The template is a studio desk, not
            a client-facing tracker and not Jira.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr className="text-xs text-[var(--muted)]">
                  <th className="py-1 font-medium">Job</th>
                  <th className="py-1 font-medium">Surface</th>
                  <th className="py-1 font-medium">Done when</th>
                </tr>
              </thead>
              <tbody>
                {JOBS.map((row) => (
                  <tr key={row.job} className="border-t border-[var(--border)] align-top">
                    <td className="py-2 font-medium">{row.job}</td>
                    <td className="py-2">{row.surface}</td>
                    <td className="py-2 text-[var(--muted)]">{row.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SpecSection>

        <SpecSection id="records" title="2. Four records — keep them apart">
          <p>
            Mixing these is the usual failure mode. An observation in Notes never becomes a
            ticket. A changelog row is not a Kanban card.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr className="text-xs text-[var(--muted)]">
                  <th className="py-1 font-medium">Record</th>
                  <th className="py-1 font-medium">What it is</th>
                  <th className="py-1 font-medium">What it is not</th>
                </tr>
              </thead>
              <tbody>
                {RECORDS.map((row) => (
                  <tr key={row.name} className="border-t border-[var(--border)] align-top">
                    <td className="py-2 font-medium">{row.name}</td>
                    <td className="py-2">{row.is}</td>
                    <td className="py-2 text-[var(--muted)]">{row.not}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SpecSection>

        <SpecSection id="anatomy" title="3. Page anatomy">
          <p>
            The host fills leftover viewport under AppShell (header, PageNav, leaf title).
            It is a column: chrome, optional filter row, then a scrollport with{" "}
            <code className="font-mono text-xs">min-h-0 flex-1</code>. The board is full
            width of that main. Do not wrap Inbox or columns in <code className="font-mono text-xs">max-w-5xl</code>.
          </p>
          <div className="mt-3 space-y-1 rounded-[10px] border border-[var(--border)] bg-[var(--page)] p-3 font-mono text-[11px] leading-relaxed text-[var(--muted)]">
            <AnatomyRow label="AppShell header" note="logo · Home · Site network · Feedback · Profile" />
            <AnatomyRow label="PageNav + leaf title + CodeBadge" note="compact on this page" />
            <div className="rounded-[8px] border border-[var(--ink)] bg-[var(--surface)] p-2 text-[var(--ink)]">
              <div className="mb-1 flex items-center justify-between gap-2 border-b border-[var(--border)] pb-1">
                <span>
                  {c.labels.inbox} · {c.labels.kanban} · {c.labels.changelog} · {c.labels.notes}
                </span>
                <span className="rounded-[8px] bg-[var(--ink)] px-2 py-0.5 text-[var(--surface)]">
                  {c.labels.raise}
                </span>
              </div>
              <div className="mb-1 border-b border-dashed border-[var(--border)] pb-1">
                {c.labels.leafs} / {c.labels.sort} / {c.labels.layout} / {c.labels.category} /{" "}
                {c.labels.more}
                <span className="ml-2 opacity-70">— Inbox and board only</span>
              </div>
              <div className="min-h-16 rounded-[6px] bg-[var(--page)] p-2">
                Body fills leftover height. Columns / list / table / textarea.
              </div>
            </div>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>{c.layout.chromeRows}</li>
            <li>{c.layout.readingWidth}</li>
            <li>
              URL <code className="font-mono text-xs">?tab=</code> follows Inbox, Changelog,
              Notes, Design spec, or Kanban. Column filters share <code className="font-mono text-xs">tab=kanban</code>.
            </li>
            <li>
              Leaf extra tools (Testing) may sit above the host as sibling chrome. They must
              not invent a second Inbox.
            </li>
          </ul>
        </SpecSection>

        <SpecSection id="visual" title="4. Visual language">
          <p>
            Same kit as the rest of the hub (<code className="font-mono text-xs">dc-design-defaults</code>
            ). Manrope, 10px radius, SG tokens. No MUI, shadcn, Bootstrap, or my-site MD3 on
            this surface.
          </p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Fact label="Typeface" value={c.density.typeface} />
            <Fact label="Radius" value={c.density.radius} />
            <Fact label="Control height" value={c.density.controlHeight} />
            <Fact label="Tabs" value={c.density.tabs} />
            <Fact label="Ground" value="--page #F5F5F4 · --surface white · --ink #3C3C3B" />
            <Fact label="Empty" value={c.density.empty} />
          </dl>
          <p className="mt-3 text-[var(--muted)]">
            Buttons: <code className="font-mono text-xs">sg-btn-primary</code> (ink fill) for
            the one commit action on a row — Raise, Save notes, Save in a modal. Secondary is
            bordered. Ghost is for Focus / Show archived companions. Selects in the filter
            row are 32px, 10px radius, not native-unstyled.
          </p>
        </SpecSection>

        <SpecSection id="colour" title="5. Colour — three jobs, never mixed">
          <p>
            Hex on a <strong>badge</strong> names the leaf. Column wash names{" "}
            <strong>workflow stage</strong>. Category pill names <strong>kind of work</strong>.
            RAG names <strong>host / presence</strong>, not ticket priority. Do not paint the
            page ground with a leaf hex.
          </p>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Columns and Inbox
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["inbox", "later", "open", "done", "archived"] as const).map((id) => (
              <Swatch
                key={id}
                hex={COLUMN_ACCENT[id]}
                label={COLUMN_LABELS[id]}
                wash
              />
            ))}
          </div>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Categories (hats / swimlanes)
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {KANBAN_CATEGORIES.map((id) => (
              <span
                key={id}
                className="inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium"
                style={{
                  color: CATEGORY_BADGE[id].color,
                  background: CATEGORY_BADGE[id].fill,
                  borderColor: CATEGORY_BADGE[id].color,
                }}
              >
                {CATEGORY_LABELS[id]}
              </span>
            ))}
          </div>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            RAG (host and presence only)
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Swatch hex="var(--rag-green)" label="Live / on live" />
            <Swatch hex="var(--rag-amber)" label="Localhost · local diff" />
            <Swatch hex="var(--rag-red)" label="Reserved (errors, not columns)" />
          </div>
          <p className="mt-3 text-[var(--muted)]">
            {c.colour.badge} Inbox pink is a lane accent, not the Kanban Online CodeBadge
            (that badge is a blue tint of Internal <code className="font-mono text-xs">#6BA4E3</code>
            ).
          </p>
        </SpecSection>

        <SpecSection id="inbox" title={`6. ${c.labels.inbox}`}>
          <p>
            Capture tray. One open list (or archived list). Cards sit in a tinted well with a
            4px left bar in Inbox pink. Title left; paperclip, leaf tag (global All only), and
            Inbox hat right. Body clipped to ~180 characters. Id and date underneath.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>
              Sort: date newest (default), oldest, A–Z, Z–A. Open and archived are separate
              lists — never mixed in one scroll.
            </li>
            <li>
              Click or Enter opens a viewport-capped editor (same leaf-tag pattern as Raise).
              Save / Cancel stay on screen.
            </li>
            <li>
              Copy-to-prompt builds a session pack (idea + board delta + small text
              attachments). Images and PDFs are listed, not inlined. Mark copied on the note.
            </li>
            <li>
              Attachments: 8 MB each, 5 per note; png/jpeg/webp/gif, pdf, txt/md/html/json/csv.
              Tickets inherit files via <code className="font-mono text-xs">sourceIdeaId</code>{" "}
              (read-only).
            </li>
          </ul>
        </SpecSection>

        <SpecSection id="board" title="7. Board">
          <p>
            Tickets only. Columns are Later / Open / Done / Archived. Default visible buckets
            are Later and Open. Checkbox filters above the board change which columns exist.
            Category select filters tickets inside those columns.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>
              <strong>Columns</strong> — workflow left-to-right. Each well: 4px stage colour
              bar, 10% wash, header with count, Focus (one column), per-column sort.
            </li>
            <li>
              <strong>Swimlanes</strong> — category rows × visible columns. Use when comparing
              Experience vs Data load, not as a second product.
            </li>
            <li>
              Checkbox filters (All, Later, Open, Done, Archived) change which columns exist.
              Default Later + Open. Category select filters tickets inside those columns.
            </li>
            <li>
              Card: title; leaf tag on global All; category pill; clipped body; id · raw
              IN-… or ad-hoc. Click opens the ticket. Do not put hours, assignees, or due
              dates on v1 cards — that is other leaves&apos; jobs.
            </li>
          </ul>
        </SpecSection>

        <SpecSection id="changelog-notes" title={`8. ${c.labels.changelog} and ${c.labels.notes}`}>
          <p>
            Changelog is a version table: Version, Datetime, Title. Newest on top. Click a
            row to expand one detail block underneath (plan rows get a small PLAN mark).
            Empty: “No version rows yet.” Same <code className="font-mono text-xs">changelogs</code>{" "}
            store as the rest of the hub — no second table.
          </p>
          <p className="mt-2">
            Notes is a staff scratchpad: muted one-liner, flex-grow textarea, primary Save.
            Persist on <code className="font-mono text-xs">kanban_leaf_notes</code> unless the
            leaf passes <code className="font-mono text-xs">onSaveNotes</code> (Buylist
            per-login store, MRT <code className="font-mono text-xs">openNotes</code>). Ideas
            do not belong here.
          </p>
        </SpecSection>

        <SpecSection id="raise" title={`9. ${c.labels.raise}`}>
          <p>
            Capture is chrome <strong>Feedback</strong> (header on desktop, floating button on
            mobile) — the Raise-style popup. It is not a button on the Development tab strip.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>
              Modal: viewport-capped <code className="font-mono text-xs">ShellModal</code>,
              max-width ~32rem, height min(90dvh, window−1.5rem). Overlay click and Esc
              close. Footer Save to Inbox / Cancel always visible.
            </li>
            <li>
              Body: type (bug default), title, growing details, leaf tag, attachments
              dropzone. Details take leftover height. Page breadcrumb is stored.
            </li>
            <li>
              Default tag is the current leaf (or Global on <code className="font-mono text-xs">/d</code>
              ). Tag is ownership, not a swimlane.
            </li>
          </ul>
        </SpecSection>

        <SpecSection id="leaf-host" title="10. Leaf tag and host awareness">
          <p>
            Leaf tag is which registry node owns the row. Global All shows tags on cards and
            a Leafs dropdown of leaves that already have a row. Empty sketched leaves stay
            out of that dropdown; they still appear in the Raise picker (Site network tree)
            so you can file ahead.
          </p>
          <p className="mt-2 text-[var(--muted)]">
            On localhost only, presence chips compare the row to the live baseline: On live,
            On live · local diff, Local only. Live Azure does not show those chips. More
            options holds snapshot / baseline tools — keep them out of the first chrome row.
          </p>
        </SpecSection>

        <SpecSection id="states" title="11. States">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left">
              <thead>
                <tr className="text-xs text-[var(--muted)]">
                  <th className="py-1 font-medium">State</th>
                  <th className="py-1 font-medium">Treatment</th>
                </tr>
              </thead>
              <tbody>
                {STATES.map((row) => (
                  <tr key={row.state} className="border-t border-[var(--border)] align-top">
                    <td className="py-2 font-medium">{row.state}</td>
                    <td className="py-2 text-[var(--muted)]">{row.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SpecSection>

        <SpecSection id="responsive" title="12. Responsive and motion">
          <p>
            Desktop is the primary desk (board needs width). On small viewports: tabs wrap,
            board columns stack, capture stays the chrome Feedback FAB, modals use the
            same viewport cap. Do not hide Inbox behind a hamburger — this template
            is the work, not chrome chrome.
          </p>
          <p className="mt-2 text-[var(--muted)]">
            Respect <code className="font-mono text-xs">prefers-reduced-motion</code> (global
            CSS already collapses transitions). No celebration animations on Save.
          </p>
        </SpecSection>

        <SpecSection id="a11y" title="13. Accessibility">
          <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>
              Tab strip is a <code className="font-mono text-xs">tablist</code>; selected tab
              uses <code className="font-mono text-xs">aria-selected</code> and the underline
              token, not colour-alone.
            </li>
            <li>Cards are keyboard buttons (Enter / Space). Focus ring from the browser.</li>
            <li>Filter controls have accessible names (Leafs, Sort, Layout, Category).</li>
            <li>Modals: labelled title, Esc, focus stays in the dialog while open.</li>
            <li>
              Do not use colour as the only status: hats have words, presence chips have
              words, Changelog plan rows say PLAN.
            </li>
          </ul>
        </SpecSection>

        <SpecSection id="embed" title="14. Embed contract">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr className="text-xs text-[var(--muted)]">
                  <th className="py-1 font-medium">Piece</th>
                  <th className="py-1 font-medium">Global /d</th>
                  <th className="py-1 font-medium">Leaf Development</th>
                </tr>
              </thead>
              <tbody>
                {EMBED.map((row) => (
                  <tr key={row.piece} className="border-t border-[var(--border)] align-top">
                    <td className="py-2 font-medium">{row.piece}</td>
                    <td className="py-2">{row.global}</td>
                    <td className="py-2">{row.leaf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[var(--muted)]">
            Sketched leaves: changelog on the shell only. No fake Inbox, no empty board, no
            Design spec. When the leaf leaves sketched, drop in{" "}
            <code className="font-mono text-xs">KanbanOnlineHost</code> with the leaf{" "}
            <code className="font-mono text-xs">nodeId</code>.
          </p>
        </SpecSection>

        <SpecSection id="out" title="15. Out of this template">
          <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>Design Library “apply to all” atlas — later, different ticket.</li>
            <li>Jira/Linear import, story points, sprints, WIP limits, auto-leveling.</li>
            <li>Guest-visible Development (MRT guests never see this host).</li>
            <li>A second design system, hex page themes, or per-leaf Kanban chrome forks.</li>
            <li>Shipping this tab on Azure until you say make it live.</li>
          </ul>
        </SpecSection>
      </article>
    </section>
  );
}

const TOC = [
  { id: "jobs", label: "Jobs" },
  { id: "records", label: "Records" },
  { id: "anatomy", label: "Anatomy" },
  { id: "visual", label: "Visual" },
  { id: "colour", label: "Colour" },
  { id: "inbox", label: "Inbox" },
  { id: "board", label: "Board" },
  { id: "changelog-notes", label: "Changelog / Notes" },
  { id: "raise", label: "Raise" },
  { id: "leaf-host", label: "Leaf / host" },
  { id: "states", label: "States" },
  { id: "responsive", label: "Responsive" },
  { id: "a11y", label: "A11y" },
  { id: "embed", label: "Embed" },
  { id: "out", label: "Out of scope" },
];

const JOBS = [
  {
    job: "Capture",
    surface: "Chrome Feedback → Inbox",
    done: "A dated note exists, tagged to a leaf, optional files.",
  },
  {
    job: "Split",
    surface: "Inbox → tickets",
    done: "One observation becomes one or more tickets with a category and column.",
  },
  {
    job: "See the work",
    surface: "Board (columns or swimlanes)",
    done: "Staff can answer what is Later / Open / Done without leaving the leaf.",
  },
  {
    job: "Remember what shipped",
    surface: "Changelog",
    done: "A version row with datetime; plan rows until that slice is live.",
  },
  {
    job: "Park messy context",
    surface: "Notes",
    done: "Scratch text saved on the leaf (or the leaf’s own notes callback).",
  },
];

const RECORDS = [
  {
    name: "Inbox note",
    is: "Raw observation. Messy on purpose. Leaf-tagged. May hold files.",
    not: "A ticket, a changelog line, or a commitment.",
  },
  {
    name: "Ticket",
    is: "A unit of work: category hat, Later/Open/Done/Archived, optional source idea.",
    not: "A version, a dump of notes, or a leaf’s product UI.",
  },
  {
    name: "Changelog entry",
    is: "Plan or release for this node. Number + datetime when shipping.",
    not: "The Kanban board. Do not file WIP as a fake 99.0 release.",
  },
  {
    name: "Leaf notes",
    is: "Bulk scratchpad for people already on the leaf.",
    not: "The inbox. If it should become work, send Feedback.",
  },
];

const STATES = [
  {
    state: "Empty list / column",
    how: 'Muted word "none". No ghost cards, no lottie, no “you’re all caught up”.',
  },
  {
    state: "Empty changelog",
    how: "“No version rows yet.” Still show the table chrome once rows exist.",
  },
  {
    state: "Archived inbox",
    how: "Hidden until Show archived (n). Toggle is a pressed bordered button, not a checkbox buried in More.",
  },
  {
    state: "Pending save",
    how: "Disable the primary button (opacity). Flash “Saved.” or the error in muted text beside it.",
  },
  {
    state: "Localhost vs live",
    how: "Presence chips and More-options snapshot tools on localhost. Live origin is the published disk — no fake “you are on prod” toast in the board.",
  },
];

const EMBED = [
  {
    piece: "Scope",
    global: "All leaves (filterable).",
    leaf: "That nodeId only.",
  },
  {
    piece: "Raise default tag",
    global: "Global.",
    leaf: "This leaf (chrome Feedback).",
  },
  {
    piece: "Design spec",
    global: "Its own Development hub card.",
    leaf: "No — stay on /d/spec.",
  },
  {
    piece: "Notes persistence",
    global: "kanban_leaf_notes for Global.",
    leaf: "Same table, or onSaveNotes if the leaf already has a store.",
  },
  {
    piece: "Changelog",
    global: "hub-development (plus legacy i-kanban rows).",
    leaf: "That leaf’s changelog rows.",
  },
  {
    piece: "Labels / colours / Raise",
    global: "KANBAN_CHROME.",
    leaf: "Same file. No restyle.",
  },
];

function SpecSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-3 space-y-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function Swatch({
  hex,
  label,
  wash,
}: {
  hex: string;
  label: string;
  wash?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-2 py-1">
      <span
        className="h-4 w-4 shrink-0 rounded-sm border border-[var(--border)]"
        style={{
          background: wash ? `color-mix(in srgb, ${hex} 35%, var(--page))` : hex,
          boxShadow: wash ? `inset 3px 0 0 ${hex}` : undefined,
        }}
      />
      <span>
        {label}
        {hex.startsWith("#") ? (
          <span className="ml-1 font-mono text-[10px] text-[var(--muted)]">{hex}</span>
        ) : null}
      </span>
    </span>
  );
}

function AnatomyRow({ label, note }: { label: string; note: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-2 py-1">
      {label}
      <span className="ml-2 opacity-70">{note}</span>
    </div>
  );
}
