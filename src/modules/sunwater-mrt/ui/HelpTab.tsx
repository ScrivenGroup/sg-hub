"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SubTabs } from "./SubTabs";

const SUBS = ["Quick reference", "User guide"] as const;

const INTRO: Record<(typeof SUBS)[number], string> = {
  "Quick reference": "Short map of the tracker. Open a More link for the full section.",
  "User guide": "How to read and plan regulator cycles, hours, and the catalog.",
};

function GuideDownloads({ htmlHref }: { htmlHref: string }) {
  return (
    <p className="mrt-guide-downloads flex flex-wrap gap-3 print:hidden">
      <a className="sg-btn-secondary text-sm" href={htmlHref} download>
        Download HTML
      </a>
      <button
        type="button"
        className="sg-btn-secondary text-sm"
        onClick={() => window.print()}
      >
        Download PDF
      </button>
    </p>
  );
}

function More({
  id,
  onOpen,
}: {
  id: string;
  onOpen: (id: string) => void;
}) {
  return (
    <button type="button" className="mrt-guide-more" onClick={() => onOpen(id)}>
      More
    </button>
  );
}

function GuideToc({ children }: { children: ReactNode }) {
  return <nav className="mrt-guide-toc">{children}</nav>;
}

export function HelpTab({
  showStaffNotes = false,
  sandbox = false,
}: {
  showStaffNotes?: boolean;
  sandbox?: boolean;
}) {
  const [sub, setSub] = useState<(typeof SUBS)[number]>("Quick reference");
  const [scrollTo, setScrollTo] = useState<string | null>(null);

  function openGuide(id: string) {
    setSub("User guide");
    setScrollTo(id);
  }

  useEffect(() => {
    if (sub !== "User guide" || !scrollTo) return;
    const node = document.getElementById(scrollTo);
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
    setScrollTo(null);
  }, [sub, scrollTo]);

  return (
    <div>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} intro={INTRO[sub]} />
      {sub === "Quick reference" ? (
        <QuickReference
          onOpen={openGuide}
          showStaffNotes={showStaffNotes}
        />
      ) : null}
      {sub === "User guide" ? (
        <UserGuide showStaffNotes={showStaffNotes} sandbox={sandbox} />
      ) : null}
    </div>
  );
}

function QuickReference({
  onOpen,
  showStaffNotes,
}: {
  onOpen: (id: string) => void;
  showStaffNotes: boolean;
}) {
  return (
    <article className="mrt-how-to-share max-w-4xl space-y-6 text-sm leading-relaxed text-[var(--ink)]">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Milestone Resourcing Tracker · Quick reference
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Quick reference</h2>
        <p className="max-w-2xl text-[var(--muted)]">
          Use this as a map. Where a topic has more detail,{" "}
          <strong>More</strong> opens that section of the User guide.
        </p>
        <GuideDownloads htmlHref="/mrt-quick-reference.html" />
      </header>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">What this is</h3>
        <ul className="mrt-guide-list">
          <li>
            Dam-safety obligations as <strong>regulator cycles</strong> (each dam
            × requirement type × due), not named project milestones.{" "}
            <More id="guide-what" onOpen={onOpen} />
          </li>
          <li>
            Plan hours on Defaults (roles) and on each occurrence (people). Hours
            seed once; later Defaults edits do not overwrite a saved plan.{" "}
            <More id="guide-defaults" onOpen={onOpen} />
          </li>
          <li>
            Overrun heatmap is planned hours: blank under capacity, yellow over
            100%, red over the overrun threshold. There is no auto-leveling.{" "}
            <More id="guide-hours" onOpen={onOpen} />
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">Tabs</h3>
        <ul className="mrt-guide-list">
          <li>
            <strong>Gantt</strong> — timeline of predicted and scheduled dues.{" "}
            <More id="guide-gantt" onOpen={onOpen} />
          </li>
          <li>
            <strong>Obligations</strong> — table of occurrences, status, due, lead-in.{" "}
            <More id="guide-obligations" onOpen={onOpen} />
          </li>
          <li>
            <strong>Inputs</strong> — dams, types, people, roles, weekly hours.{" "}
            <More id="guide-inputs" onOpen={onOpen} />
          </li>
          <li>
            <strong>Definitions</strong> — which types apply to which dams, who
            can fill which roles.{" "}
            <More id="guide-definitions" onOpen={onOpen} />
          </li>
          <li>
            <strong>Defaults</strong> — lead-in months and role-hour templates.{" "}
            <More id="guide-defaults" onOpen={onOpen} />
          </li>
          <li>
            <strong>Help</strong> — this guide and the full User guide.
          </li>
          {showStaffNotes ? (
            <li>
              <strong>Admin</strong> and <strong>Development</strong> are staff
              only. Sharing lives under Admin.{" "}
              <More id="guide-staff" onOpen={onOpen} />
            </li>
          ) : (
            <li>
              This desk is a <strong>personal copy</strong> of the live plan.
              You can drag and save here. <strong>Reset to live plan</strong>{" "}
              restores the current live copy. You cannot change the live plan.{" "}
              <More id="guide-guest" onOpen={onOpen} />
            </li>
          )}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">Gantt</h3>
        <ul className="mrt-guide-list">
          <li>
            Filter by asset, type, and due. Weeks or Months grain. Zoom timescale
            and rows.{" "}
            <More id="guide-gantt" onOpen={onOpen} />
          </li>
          <li>
            Drag a milestone diamond to move that due (and attached task hours).
            Then <strong>Recalc</strong> (↺) so later predicted dates keep that
            week-ending. Amber ↺ means this row is stale.{" "}
            <More id="guide-recalc" onOpen={onOpen} />
          </li>
          <li>
            <strong>On screen</strong> jumps to today. <strong>First due</strong>{" "}
            jumps to the earliest filtered incomplete occurrence.{" "}
            <More id="guide-gantt" onOpen={onOpen} />
          </li>
          <li>
            Resource-hours pane: planned load vs available hours. Click a red or
            yellow cell for the stack; Rebalance opens several obligations for
            one person.{" "}
            <More id="guide-hours" onOpen={onOpen} />
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">Occurrence and Effort</h3>
        <ul className="mrt-guide-list">
          <li>
            Click a diamond to open the occurrence: due, lead-in/tail, people,
            and the Effort chart.{" "}
            <More id="guide-effort" onOpen={onOpen} />
          </li>
          <li>
            <strong>Save</strong> keeps hour edits. <strong>Close</strong>{" "}
            discards unsaved hour edits.{" "}
            <More id="guide-effort" onOpen={onOpen} />
          </li>
          <li>
            <strong>Enable Project Management</strong> shows status, actuals,
            FAC, and VAC (hours and costs). Off by default.{" "}
            <More id="guide-pm" onOpen={onOpen} />
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">Not in this version</h3>
        <ul className="mrt-guide-list">
          <li>
            Followups, Assumptions, non-resource costing, and automatic leveling.
            Heatmap stays planned hours.{" "}
            <More id="guide-out" onOpen={onOpen} />
          </li>
        </ul>
      </section>
    </article>
  );
}

function UserGuide({
  showStaffNotes,
  sandbox,
}: {
  showStaffNotes: boolean;
  sandbox: boolean;
}) {
  return (
    <article className="mrt-how-to-share max-w-4xl space-y-8 text-sm leading-relaxed text-[var(--ink)]">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Milestone Resourcing Tracker · User guide
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">User guide</h2>
        <p className="max-w-2xl text-[var(--muted)]">
          How to read the plan, move dues, assign people, and seed hours. A
          shorter map lives on Quick reference.
        </p>
        <GuideDownloads htmlHref="/mrt-user-guide.html" />
      </header>

      <GuideToc>
        <a href="#guide-what">What this is</a>
        <a href="#guide-tabs">Tabs</a>
        <a href="#guide-gantt">Gantt</a>
        <a href="#guide-recalc">Recalc and First due</a>
        <a href="#guide-hours">Resource hours</a>
        <a href="#guide-effort">Occurrence and Effort</a>
        <a href="#guide-pm">Project Management</a>
        <a href="#guide-obligations">Obligations</a>
        <a href="#guide-inputs">Inputs</a>
        <a href="#guide-definitions">Definitions</a>
        <a href="#guide-defaults">Defaults</a>
        <a href="#guide-guest">Shared view</a>
        {showStaffNotes ? <a href="#guide-staff">Staff</a> : null}
        <a href="#guide-out">Out of this version</a>
      </GuideToc>

      <section id="guide-what" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">What this is</h3>
        <p>
          The Milestone Resourcing Tracker plans <strong>regulator cycles</strong>{" "}
          for dam safety: each dam × requirement type × due date. It is not a
          list of named engagement milestones.
        </p>
        <p>
          Staff apply a seeded catalog of obligation types and roles, and may
          add or rename. Plan hours sit on <strong>Defaults</strong> (by role)
          and on the occurrence popup (by person). Those hours <strong>seed
          once</strong>: saving an occurrence keeps that plan even if Defaults
          change later.
        </p>
        <p>
          Load is a heatmap of <strong>planned</strong> hours against weekly
          available hours. The app does not level or auto-move work.
        </p>
      </section>

      <section id="guide-tabs" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">Tabs</h3>
        <p>
          Product tabs sit under the page title. <strong>← Back</strong> returns
          to the previous tracker tab when you jumped (for example from Gantt to
          a person on Inputs).
        </p>
        <ul className="mrt-guide-list">
          <li>
            <strong>Gantt</strong> — cyclical timeline and resource-hours pane.
          </li>
          <li>
            <strong>Obligations</strong> — every occurrence as a table.
          </li>
          <li>
            <strong>Inputs</strong> — assets, types, roles, named people.
          </li>
          <li>
            <strong>Definitions</strong> — applicability and ownership matrices.
          </li>
          <li>
            <strong>Defaults</strong> — lead-in months and default effort hours.
          </li>
          <li>
            <strong>Help</strong> — Quick reference and this User guide.
          </li>
        </ul>
        <p>
          Guests see those six tabs on a personal copy of the live plan. Staff
          also see{" "}
          <strong>Admin</strong> (sharing) and <strong>Development</strong>{" "}
          (changelog and notes).
        </p>
      </section>

      <section id="guide-gantt" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">Gantt</h3>
        <p>
          Each row is a dam × obligation type. Diamonds on the timeline are
          occurrences: predicted (open), scheduled (solid), completed, or not
          required. The one-line intro under the tab is the working rule: drag a
          due, then Recalc so later dates keep that week-ending.
        </p>
        <ul className="mrt-guide-list">
          <li>
            Filter by <strong>Asset</strong>, <strong>Type</strong>, and{" "}
            <strong>Due</strong>. Each filter has Select all / Clear all.
          </li>
          <li>
            Switch grain with <strong>Weeks</strong> / <strong>Months</strong>.
            Zoom the timescale and the row height.
          </li>
          <li>
            <strong>On screen</strong> centres today. <strong>First due</strong>{" "}
            jumps to the earliest filtered obligation that is still on the board
            (not complete).
          </li>
          <li>
            Drag a diamond to move that due. Task hours on the Effort chart move
            with the milestone (tail-end shift; stick unchanged).
          </li>
          <li>
            Flatten, Dam↔Obl, and the FY timeline sit on the chrome row above
            the chart. Open <strong>Legend</strong> for marker colours.
          </li>
        </ul>
      </section>

      <section id="guide-recalc" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">Recalc and First due</h3>
        <p>
          After you drag a due, later <em>predicted</em> dates on that row may
          still be on the old cycle. Press <strong>↺ Recalc</strong> on the row.
          Recalc uses the next known due as the cycle origin (skipping
          not-required). Scheduled and completed stays. Predicted futures are
          replaced. Hidden predicted occurrences come back.
        </p>
        <p>
          Recalc keeps the <strong>week-ending day</strong> you dragged — not
          month-end. If you move a due inside the same month, ↺ turns amber
          until you Recalc. Obligations has the same Recalculate action.
        </p>
        <p>
          <strong>First due</strong> (next to On screen) scrolls to the earliest
          incomplete marker in the current filters.
        </p>
      </section>

      <section id="guide-hours" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">Resource hours</h3>
        <p>
          The lower Gantt pane is planned load by person and week. Cells stay
          blank when hours are at or under weekly available capacity.{" "}
          <strong>Yellow</strong> is over 100%. <strong>Red</strong> is over the
          overrun threshold (default 125%, set on Inputs → Resource Names).
        </p>
        <ul className="mrt-guide-list">
          <li>
            Hover or click a yellow/red cell to see which obligations stack that
            week.
          </li>
          <li>
            <strong>Rebalance</strong> opens those contributing Effort charts on
            one week axis so you can edit hours by hand. It does not auto-level.
          </li>
          <li>
            Click a name to jump to that person on Inputs. Availability and
            summary toggles (This milestone | Everywhere, Total | Available/over)
            live on the Effort chart, not only here.
          </li>
        </ul>
      </section>

      <section id="guide-effort" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">Occurrence and Effort</h3>
        <p>
          Click a diamond (or open a row from Obligations) for the occurrence
          popup. Set due date, lead-in and tail, assign people to tasks, and plan
          hours on the Effort Gantt.
        </p>
        <ul className="mrt-guide-list">
          <li>
            Task, Role, and Name stay frozen on the left; week columns scroll.
            Hide a meta column with ×; bring it back from <strong>Columns</strong>.
          </li>
          <li>
            Toolbar groups: Unstick / Tail start / Tail end · Columns · Centre /
            Collapse / Availability.
          </li>
          <li>
            Resource summary hours update while you drag. Weeks zoom is an inline
            chip (− % +).
          </li>
          <li>
            <strong>Save</strong> writes hour edits. <strong>Save and Close</strong>{" "}
            does both. <strong>Close</strong> (and Esc) discard unsaved hour
            edits. The italic note under the chart reminds you that Defaults
            seeded this plan once.
          </li>
          <li>
            Changing role keeps the name and warns with * when that person is
            out of the role catalog for the dropdown.
          </li>
          <li>
            Reset icons restore due/tail or hours to Defaults without snapping
            the window to the tail.
          </li>
        </ul>
      </section>

      <section id="guide-pm" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">Project Management</h3>
        <p>
          <strong>Enable Project Management</strong> is off by default. When it
          is on, the Effort chart shows status, actual hours / actual $, FAC, and
          VAC — and forces Hours and Costs columns on. FAC is actuals plus
          remaining planned from today. VAC is FAC minus budget. The heatmap
          still uses planned hours only.
        </p>
      </section>

      <section id="guide-obligations" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">Obligations</h3>
        <p>
          A table of every occurrence in the horizon. Sub-tabs:{" "}
          <strong>All Obligations</strong>, <strong>Ongoing</strong> (overdue and
          in the lead-in window now), and <strong>Upcoming</strong> (next dues
          inside the look-ahead you pick).
        </p>
        <ul className="mrt-guide-list">
          <li>Filter assets and obligation types (Select all / Clear all).</li>
          <li>Open a row for the same occurrence popup as the Gantt.</li>
          <li>
            <strong>Go to Gantt</strong> centres that marker and pulses it.
          </li>
          <li>
            Recalculate on a row is the same cycle rebase as Gantt ↺.
          </li>
        </ul>
      </section>

      <section id="guide-inputs" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">Inputs</h3>
        <p>The catalog you plan against. Four sub-tabs:</p>
        <ul className="mrt-guide-list">
          <li>
            <strong>Assets</strong> — dams on this plan.
          </li>
          <li>
            <strong>Obligation Types</strong> — regulator requirement types and
            their cycle (for example every n years).
          </li>
          <li>
            <strong>Resource Roles</strong> — role catalogue, rates, default
            weekly hours.
          </li>
          <li>
            <strong>Resource Names</strong> — named people, roles they hold,
            weekly available hours, overrun threshold. External rate shows a
            colour dot when it differs from the role default.
          </li>
        </ul>
        <p>
          Cross-links take you to the matching Definitions matrix. Removing a
          dam, type, role, or person cascades so leftover assignments do not
          orphan.
        </p>
      </section>

      <section id="guide-definitions" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">Definitions</h3>
        <ul className="mrt-guide-list">
          <li>
            <strong>Asset × Obligation</strong> — which types apply to which
            dams, plus each cycle origin (the date later Recalc uses).
          </li>
          <li>
            <strong>Resource × Role</strong> — who can fill which roles in the
            Effort dropdowns.
          </li>
          <li>
            <strong>Asset × Resource Role</strong> — named owners per dam,
            region, or all assets, by role.
          </li>
        </ul>
      </section>

      <section id="guide-defaults" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">Defaults</h3>
        <ul className="mrt-guide-list">
          <li>
            <strong>Lead-in time per dam</strong> — months of lead-in before
            each dam × obligation due. That window is the Effort chart for a new
            occurrence.
          </li>
          <li>
            <strong>Task+Resource Effort</strong> — default hours by role that{" "}
            <strong>seed a new occurrence once</strong>. After you save that
            occurrence, editing Defaults does not overwrite it. Reset on the
            occurrence restores the current Defaults if you want that.
          </li>
        </ul>
        <p>
          Cross-links on Defaults go to Inputs (Assets, Obligation Types,
          Resource Roles).
        </p>
      </section>

      <section id="guide-guest" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">Shared view</h3>
        <p>
          A guest opens a labelled link, enters their name and the share
          password, and works a <strong>personal copy</strong> of the live plan.
          Drag and hour edits save on that desk only.{" "}
          <strong>Reset to live plan</strong> restores the current live copy.
          They cannot change the live plan. They do not use the site Microsoft
          login. Tabs: Gantt, Obligations, Inputs, Definitions, Defaults, and
          Help.
        </p>
        {sandbox ? (
          <p>
            Reset sits in the bar above the tabs on this desk.
          </p>
        ) : null}
        <p>
          Home, Feedback, Admin, and Development are hidden.
        </p>
      </section>

      {showStaffNotes ? (
        <section id="guide-staff" className="mrt-guide-section space-y-2">
          <h3 className="text-base font-semibold">Staff</h3>
          <p>
            Create and cut guest links under <strong>Admin → Sharing</strong>.
            The staff how-to is <strong>Admin → Guides → How to share</strong>{" "}
            (HTML and PDF). Do not put the share password in Azure App Settings.
            Copy the link; tell the password another way.
          </p>
          <p>
            <strong>Development → Changelog</strong> is what shipped and what is
            still WIP. <strong>Development → Notes</strong> is a staff-only
            scratchpad saved with this plan — not shown on a guest share.
          </p>
        </section>
      ) : null}

      <section id="guide-out" className="mrt-guide-section space-y-2">
        <h3 className="text-base font-semibold">Out of this version</h3>
        <p>
          Followups, Assumptions, non-resource / intangibles costing, and
          automatic leveling. The heatmap is planned hours only.
        </p>
      </section>
    </article>
  );
}
