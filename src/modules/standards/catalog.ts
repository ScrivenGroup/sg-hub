export type LibraryLayer = "token" | "object" | "pattern" | "behaviour";
export type LibraryStatus = "kit" | "decided" | "gap" | "conflict";

export type LibraryConflict = {
  leaf: string;
  where: string;
  instead: string;
};

export type LibraryDecision = {
  at: string;
  from: string;
  to: string;
  why: string;
};

export type LibraryEntry = {
  id: string;
  layer: LibraryLayer;
  title: string;
  /** Class, CSS variable, or component name agents must use. */
  use: string;
  kitDefault: string;
  current?: string;
  /** What the farm found in the hub today. */
  exists?: string;
  /** Recommended next default — not applied until you say so. */
  suggest?: string;
  status: LibraryStatus;
  notes?: string;
  decisions?: LibraryDecision[];
  conflicts?: LibraryConflict[];
};

export const LIBRARY_SEED: LibraryEntry[] = [
  {
    id: "tok-ink",
    layer: "token",
    title: "Ink",
    use: "--ink",
    kitDefault: "#3C3C3B — text and primary fill",
    status: "kit",
  },
  {
    id: "tok-page",
    layer: "token",
    title: "Page ground",
    use: "--page",
    kitDefault: "#F5F5F4",
    status: "kit",
  },
  {
    id: "tok-surface",
    layer: "token",
    title: "Surface",
    use: "--surface",
    kitDefault: "#FFFFFF — cards and chrome",
    status: "kit",
  },
  {
    id: "tok-surface-muted",
    layer: "token",
    title: "Muted surface",
    use: "--surface-muted",
    kitDefault: "#ECECEC — hover wash, pill fill",
    current: "Listed on Appearance with the other CSS tokens",
    exists: "In globals.css. Appearance now lists it (and RAG).",
    suggest: "Done — token home matches CSS. No further product work.",
    status: "decided",
    decisions: [
      {
        at: "2026-09-17T00:00:00.000Z",
        from: "Appearance omitted --surface-muted and RAG",
        to: "Appearance lists them",
        why: "The token home must match globals.css. Not a product restyle.",
      },
    ],
  },
  {
    id: "tok-border",
    layer: "token",
    title: "Border",
    use: "--border",
    kitDefault: "#D4D4D2 hairline",
    status: "kit",
  },
  {
    id: "tok-muted",
    layer: "token",
    title: "Muted text",
    use: "--muted",
    kitDefault: "#6B6B69",
    status: "kit",
  },
  {
    id: "tok-rag",
    layer: "token",
    title: "RAG",
    use: "--rag-green / --rag-amber / --rag-red",
    kitDefault: "Status colour only — never button fill or page theme",
    exists:
      "RagDot + Definition attention as intended. Buylist uses RAG washes for sell/over/under table heat. MRT Gantt uses rag-red for today-line.",
    suggest:
      "Keep RAG = status. Allow wash-on-data (heatmap, today-line) as a documented exception — not a second green/red button. Do not paint page ground with RAG.",
    status: "conflict",
    notes: "RagDot + Definition attention. Hex on a leaf badge is a different job.",
    conflicts: [
      {
        leaf: "MTG Buylist",
        where: "MtgBuylistWorkspace.tsx table heat",
        instead: "RAG washes for sell / over / under",
      },
      {
        leaf: "Sunwater MRT",
        where: "GanttTab today-line",
        instead: "rag-red as a date marker, not host RAG",
      },
    ],
  },
  {
    id: "tok-radius",
    layer: "token",
    title: "Radius",
    use: "--radius",
    kitDefault: "10px",
    exists: "Hub kit 10px. MRT mrt-btn-primary/secondary use 8px.",
    suggest: "Keep 10px. When MRT buttons move to sg-btn-*, radius follows. Do not add a second radius token.",
    status: "conflict",
    conflicts: [
      {
        leaf: "Sunwater MRT",
        where: "src/modules/sunwater-mrt/ui/mrt-tables.css (.mrt-btn-*)",
        instead: "8px on mrt-btn-primary / secondary",
      },
    ],
  },
  {
    id: "tok-control-height",
    layer: "token",
    title: "Control height",
    use: "--sg-btn-height",
    kitDefault: "32px (2rem) — buttons, inputs, tabs",
    exists: "Hub and Kanban LAYOUT toggle are 32px. MRT remove button is 44px (compact variant exists). Atlas teaching HTML is 44px (not product).",
    suggest: "Keep 32px on hub controls. Compact-only exceptions stay leaf-local until a named size token is worth it.",
    status: "kit",
    notes: "Teaching atlas HTML uses 44px. Atlas is not product; do not copy it onto hub pages.",
  },
  {
    id: "tok-type",
    layer: "token",
    title: "Typeface",
    use: "--font-sans",
    kitDefault: "Manrope",
    status: "kit",
  },
  {
    id: "tok-elevation",
    layer: "token",
    title: "Elevation",
    use: "(none)",
    kitDefault: "Cards have no shadow. Dialogs may.",
    exists: "ShellModal uses Tailwind shadow-xl. EffortPopupShell does not. Cards have none.",
    suggest: "No elevation token yet. When ShellModal is brought to the PLATFORM overlay, drop the shadow or name --sg-shadow-dialog. Do not add card shadows.",
    status: "gap",
    notes: "ShellModal uses shadow-xl. No named token.",
  },
  {
    id: "tok-icon",
    layer: "token",
    title: "Iconography",
    use: "(none)",
    kitDefault: "No icon set. InfoTip is a letter i.",
    exists: "Letter-i InfoTip only. No SVG sprite or icon font on hub pages.",
    suggest: "Stay with text/letter affordances until a leaf truly needs icons. Do not import Lucide/Heroicons.",
    status: "gap",
  },
  {
    id: "tok-focus",
    layer: "token",
    title: "Focus ring",
    use: "(none)",
    kitDefault: "Browser default. Skip link has its own fill.",
    exists: "No :focus-visible rules on sg-btn / sg-input.",
    suggest: "Add a 2px ink outline on :focus-visible for sg-btn-*, sg-input, sg-tab. Do not remove native focus.",
    status: "gap",
  },
  {
    id: "tok-motion",
    layer: "token",
    title: "Motion",
    use: "prefers-reduced-motion in globals.css",
    kitDefault: "Cut animation/transition to ~0 when reduced motion. Hover 0.12–0.15s on secondary/card.",
    exists: "Global reduced-motion cut is in place. No duration tokens.",
    suggest: "Keep the media query. Do not add an animation library or named durations until a leaf needs them.",
    status: "kit",
  },
  {
    id: "obj-btn-primary",
    layer: "object",
    title: "Primary button",
    use: "sg-btn-primary",
    kitDefault: "Ink fill, no border, 10px radius, 32px height. One commit action per row.",
    exists:
      "sg-btn-primary in chrome, login, Buylist, Standards, some MRT Help/Admin. MRT product tables use mrt-btn-primary (fill + 1px ink border, 8px). Kanban chromeBtn('primary') duplicates the fill with no sg- class.",
    suggest:
      "Decide borders: (A) add 1px ink border to sg-btn-primary so MRT and kit match, or (B) keep fill-only and retarget mrt-btn-primary + chromeBtn to sg-btn-primary. Recommend A if you want “always a border on solid buttons”; ghost stays borderless.",
    status: "conflict",
    notes: "If you decide “always borders on buttons”, that decision lives here. Kit default stays visible.",
    conflicts: [
      {
        leaf: "Sunwater MRT",
        where: ".mrt-btn-primary",
        instead: "Ink fill plus 1px ink border, 8px radius",
      },
      {
        leaf: "Development / Kanban",
        where: "KanbanOnlineHost chromeBtn('primary')",
        instead: "Duplicate fill classes, not sg-btn-primary",
      },
    ],
  },
  {
    id: "obj-btn-secondary",
    layer: "object",
    title: "Secondary button",
    use: "sg-btn-secondary",
    kitDefault: "Surface fill, 1px --border, hover darkens border to ink",
    exists: "sg-btn-secondary in chrome and most leaves. MRT mrt-btn-secondary is the same job at 8px. Kanban chromeBtn('secondary') is a parallel class string.",
    suggest: "Keep sg-btn-secondary as the name. Retarget MRT and Kanban chromeBtn secondary to it. No second secondary style.",
    status: "conflict",
    conflicts: [
      {
        leaf: "Sunwater MRT",
        where: ".mrt-btn-secondary",
        instead: "Same job, 8px radius, leaf CSS",
      },
      {
        leaf: "Development / Kanban",
        where: "KanbanOnlineHost chromeBtn('secondary')",
        instead: "Duplicate bordered button classes",
      },
    ],
  },
  {
    id: "obj-btn-ghost",
    layer: "object",
    title: "Ghost button",
    use: "sg-btn-ghost",
    kitDefault: "No chrome until hover wash",
    status: "kit",
  },
  {
    id: "obj-btn-destructive",
    layer: "object",
    title: "Destructive button",
    use: "(none — not in kit)",
    kitDefault: "Not defined. Do not invent a third green/red primary.",
    exists: "MRT .mrt-btn-remove (red wash, often 44px). Buylist one-off red-border class on Run. No sg-btn-danger.",
    suggest: "Add sg-btn-danger to globals.css: 32px, 10px radius, red border, surface fill, rag-red text. Then retarget MRT remove + Buylist. Confirm before using it (beh-destructive).",
    status: "conflict",
    conflicts: [
      {
        leaf: "Sunwater MRT",
        where: ".mrt-btn-remove",
        instead: "Red-tinted border button, 44px min-height (compact variant exists)",
      },
      {
        leaf: "MTG Buylist",
        where: "MtgBuylistWorkspace.tsx",
        instead: "One-off red-border className",
      },
    ],
  },
  {
    id: "obj-input",
    layer: "object",
    title: "Input",
    use: "sg-input",
    kitDefault: "Full width, 32px min-height, 1px border, 10px radius. Also select and textarea.",
    exists: "sg-input on forms. Kanban filter selects use a parallel chromeSelect string (same look, no sg-input).",
    suggest: "Use sg-input for selects too (width auto where the filter row needs it). Retarget chromeSelect.",
    status: "conflict",
    conflicts: [
      {
        leaf: "Kanban / Development",
        where: "KanbanOnlineHost chromeSelect",
        instead: "Duplicate 32px select classes, not sg-input",
      },
    ],
  },
  {
    id: "obj-card",
    layer: "object",
    title: "Card",
    use: "sg-card",
    kitDefault: "Surface, 1px border, 10px radius, 1.25rem padding. Hover darkens border to ink.",
    exists: "sg-card everywhere. Hover makes static blocks look clickable (this library, Process, empty states).",
    suggest: "Add sg-card-static (no hover border) for non-interactive blocks. Keep hover on Home door cards and HubLanding.",
    status: "conflict",
    notes: "Tied to beh-hover.",
  },
  {
    id: "obj-tab",
    layer: "object",
    title: "Tab",
    use: "sg-tab",
    kitDefault: "Underline, not pills. aria-selected / aria-current paints the ink underline.",
    exists:
      "sg-tab on Standards, Buylist, Kanban host. MRT SubTabs is a parallel underline (min-h-9, not sg-tab). Kanban LAYOUT is a segmented toggle, not a tab.",
    suggest: "Retarget MRT SubTabs to sg-tab. Keep LAYOUT as obj-seg, not a tab.",
    status: "conflict",
    conflicts: [
      {
        leaf: "Sunwater MRT",
        where: "src/modules/sunwater-mrt/ui/SubTabs.tsx",
        instead: "Custom underline buttons, min-h-9, not sg-tab",
      },
    ],
  },
  {
    id: "obj-badge",
    layer: "object",
    title: "Code badge",
    use: "CodeBadge",
    kitDefault: "Leaf 6-hex on the badge only — never the page ground",
    status: "kit",
  },
  {
    id: "obj-status-pill",
    layer: "object",
    title: "Status pill",
    use: "StatusPill",
    kitDefault: "Sketched / Building / Live — muted pill, not RAG",
    status: "kit",
  },
  {
    id: "obj-rag",
    layer: "object",
    title: "RAG dot",
    use: "RagDot",
    kitDefault: "Amber/red attention only; green is omitted",
    status: "kit",
  },
  {
    id: "obj-info",
    layer: "object",
    title: "Info tip",
    use: "InfoTip",
    kitDefault: "Native title tooltip, letter i",
    status: "kit",
  },
  {
    id: "obj-skip",
    layer: "object",
    title: "Skip link",
    use: "sg-skip",
    kitDefault: "Off-screen until focus. Jumps to #main.",
    exists: "AppShell skip link. One home. Correct.",
    suggest: "Keep. Do not add a second skip control.",
    status: "kit",
  },
  {
    id: "obj-link",
    layer: "object",
    title: "Text link",
    use: "underline underline-offset-2",
    kitDefault: "Ink colour, underline on hover/always in body copy. Not a button.",
    exists: "Body links use underline-offset-2. MRT CrossLinks use .mrt-type-link chips, not text links.",
    suggest: "In-page text stays underlined. Chip/filter links are obj-chip, not this object.",
    status: "kit",
  },
  {
    id: "obj-chip",
    layer: "object",
    title: "Chip / type link",
    use: "(none)",
    kitDefault: "Not in the kit.",
    exists: "MRT .mrt-type-link — pill, border, muted fill, 28px.",
    suggest: "If a second leaf needs pills, add sg-chip from the MRT look at 32px/10px. Until then MRT keeps the leaf class.",
    status: "gap",
    conflicts: [
      {
        leaf: "Sunwater MRT",
        where: ".mrt-type-link",
        instead: "Pill chrome for cross-links and type jumps",
      },
    ],
  },
  {
    id: "obj-seg",
    layer: "object",
    title: "Segmented control",
    use: "(none)",
    kitDefault: "Not in the kit. Tabs are sg-tab, not segments.",
    exists: "Kanban LAYOUT Columns/Swimlanes toggle. MRT mrt-seg-btn on Gantt.",
    suggest: "Name sg-seg later from the Kanban LAYOUT toggle (32px, ink on selected). Retarget mrt-seg-btn when that exists. Do not use sg-tab for A/B tools.",
    status: "gap",
    conflicts: [
      {
        leaf: "Development / Kanban",
        where: "KanbanOnlineHost layoutToggleClass",
        instead: "Inline segmented toggle",
      },
      {
        leaf: "Sunwater MRT",
        where: ".mrt-seg-btn",
        instead: "Gantt everywhere / availability segments",
      },
    ],
  },
  {
    id: "obj-check",
    layer: "object",
    title: "Checkbox and radio",
    use: "(native)",
    kitDefault: "Native controls. No custom box.",
    exists: "Native checkboxes/radios (MRT FilterChecklist, Kanban, Buylist). No custom SVG boxes.",
    suggest: "Keep native. Do not introduce a custom checkbox kit.",
    status: "kit",
  },
  {
    id: "obj-banner",
    layer: "object",
    title: "Inline alert",
    use: "(none — Buylist uses a red sg-card role=alert)",
    kitDefault: "Not named.",
    exists: "Buylist Run error card. Drop/Dev-choices use text-only rag-red under the form.",
    suggest: "Page/load errors: sg-card + role=alert. Field errors stay under the input. No toast for these.",
    status: "gap",
    conflicts: [
      {
        leaf: "MTG Buylist",
        where: "MtgBuylistWorkspace.tsx role=alert",
        instead: "Red-border sg-card as a one-off banner",
      },
    ],
  },
  {
    id: "obj-toast",
    layer: "object",
    title: "Toast",
    use: "(none)",
    kitDefault: "Not in the kit.",
    exists: "Nothing. Feedback flashes copy in the popup. Kanban clipboard fallback is inline.",
    suggest: "Do not add toasts in this sitting. Explicit Save + inline flash is enough.",
    status: "gap",
  },
  {
    id: "obj-dialog",
    layer: "object",
    title: "Dialog",
    use: "EffortPopupShell (viewport-capped) — ShellModal is the chrome/kanban dialog",
    kitDefault:
      "PLATFORM: fixed inset-0 grid overlay, flex column dialog, scrollport min-height 0. Esc closes. Footer stays.",
    exists:
      "EffortPopupShell matches PLATFORM (MRT occurrence/stacked). ShellModal is flex-centered, overlay scroll, shadow-xl — Feedback, Kanban, Site network.",
    suggest:
      "One object: bring ShellModal to the EffortPopupShell overlay (viewport-capped). Keep Esc. Overlay-click-to-close can stay on chrome dialogs; MRT effort popups stay click-outside-off if that is the product rule.",
    status: "conflict",
    conflicts: [
      {
        leaf: "Chrome / Kanban / Feedback",
        where: "src/core/shell/ShellModal.tsx",
        instead: "flex items-center overlay, overflow-y on the overlay, shadow-xl",
      },
      {
        leaf: "Sunwater MRT",
        where: "EffortPopupShell.tsx",
        instead: "Matches PLATFORM viewport-cap",
      },
    ],
  },
  {
    id: "obj-table",
    layer: "object",
    title: "Table",
    use: "(no sg-table yet)",
    kitDefault: "Simple HTML table. Header muted, medium weight. Numeric tabular if lots of numbers.",
    exists:
      "HTML tables on Process, Dev choices, Kanban spec, Buylist Run. MRT mrt-tables.css + Gantt column hide. No sg-table class.",
    suggest:
      "Do not add a table library. Leave MRT Gantt CSS as a leaf exception. If a second dense product table appears, then name sg-table from the Process/Dev-choices chrome (muted header, overflow-x).",
    status: "gap",
    notes: "MRT has its own table CSS. Do not import a table library.",
    conflicts: [
      {
        leaf: "Sunwater MRT",
        where: "mrt-tables.css",
        instead: "Leaf table chrome, column hide on Gantt",
      },
    ],
  },
  {
    id: "pat-page-header",
    layer: "pattern",
    title: "Page header",
    use: "PageNav + h1 text-3xl + CodeBadge + StatusPill + muted description",
    kitDefault: "Same on every leaf home. Compact header only when the body is a full-viewport host (Kanban).",
    status: "kit",
  },
  {
    id: "pat-leaf-tabs",
    layer: "pattern",
    title: "Leaf tab strip",
    use: "sg-tab + ?tab=",
    kitDefault: "Underline tabs. Product tabs and Development share the strip or sit above the host.",
    status: "kit",
  },
  {
    id: "pat-form",
    layer: "pattern",
    title: "Form block",
    use: "label above sg-input, error under the field",
    kitDefault: "Not a CSS object yet. Copy the Dev choices / Drop form.",
    exists: "Label-above-input is common. No shared FormField component. Error placement varies.",
    suggest: "Keep the pattern as copy (label, sg-input, error under). Extract a component only when a third form copies Drop/Dev-choices.",
    status: "gap",
  },
  {
    id: "pat-empty",
    layer: "pattern",
    title: "Empty state",
    use: "One muted sentence. Keep page chrome.",
    kitDefault: "Copy varies (“No … yet”). Do not hide table chrome once data can exist.",
    status: "kit",
  },
  {
    id: "pat-loading",
    layer: "pattern",
    title: "Loading skeleton",
    use: "route loading.tsx + pulse cards",
    kitDefault: "Never a blank paint.",
    exists: "Only src/app/p/mtg-buylist/loading.tsx. Other routes paint blank until RSC finishes.",
    suggest:
      "Add a shared pulse-card skeleton and put loading.tsx on live leaves that feel slow (MRT, /d, Buylist already has one). Sketched shells can stay blank. Not every inner tab.",
    status: "conflict",
    conflicts: [
      {
        leaf: "MTG Buylist",
        where: "src/app/p/mtg-buylist/loading.tsx",
        instead: "Only product route with a loading.tsx today",
      },
    ],
  },
  {
    id: "beh-page-loading",
    layer: "behaviour",
    title: "Page loading",
    use: "App Router loading.tsx",
    kitDefault: "Show a skeleton while the page loads.",
    exists: "Only Buylist loading.tsx.",
    suggest: "Same as pat-loading: shared skeleton, live leaves first. Not sketched shells.",
    status: "conflict",
    notes: "Only Buylist has one. Decide whether every live leaf gets one.",
    conflicts: [
      {
        leaf: "Most leaves",
        where: "src/app/** (no loading.tsx)",
        instead: "Blank paint until RSC finishes",
      },
    ],
  },
  {
    id: "beh-pending",
    layer: "behaviour",
    title: "Button pending",
    use: "disabled + opacity while useTransition",
    kitDefault: "No double submit.",
    status: "kit",
  },
  {
    id: "beh-empty",
    layer: "behaviour",
    title: "Empty",
    use: "Keep chrome; one sentence",
    kitDefault: "Do not invent illustration empty-states.",
    status: "kit",
  },
  {
    id: "beh-errors",
    layer: "behaviour",
    title: "Errors",
    use: "Inline under the field for forms; page-level for load failures",
    kitDefault: "Not locked. Feedback vs Kanban clipboard messages differ.",
    exists: "Inline rag-red under fields (Drop, Dev choices, Admin). Buylist page-level role=alert card. Kanban clipboard fallback copy.",
    suggest: "Forms: error under the field in rag-red text. Page/load: one sg-card with role=alert. No toast until obj-toast exists.",
    status: "gap",
  },
  {
    id: "beh-dialogs",
    layer: "behaviour",
    title: "Dialogs",
    use: "Esc closes; viewport-capped; footer stays",
    kitDefault: "PLATFORM overlay rules.",
    exists: "Esc on ShellModal and EffortPopupShell. Overlay click closes ShellModal only.",
    suggest: "Lock Esc everywhere. Viewport-cap both shells. Overlay-click: chrome yes, dense MRT editors no.",
    status: "conflict",
    notes: "Tied to obj-dialog. Overlay-click-to-close is ShellModal yes, Effort popup no.",
  },
  {
    id: "beh-tables",
    layer: "behaviour",
    title: "Tables",
    use: "overflow-x; muted headers; tabular numbers",
    kitDefault: "No sticky header rule yet. MRT Gantt can hide columns.",
    exists: "overflow-x on several tables. Gantt column hide is MRT-only. No sticky thead.",
    suggest: "Standard: overflow-x + muted header + tabular nums when the column is numeric. Sticky header and column-hide stay MRT until a second Gantt-class table lands.",
    status: "gap",
  },
  {
    id: "beh-destructive",
    layer: "behaviour",
    title: "Destructive confirm",
    use: "Confirm before delete/archive. Not a primary ink button.",
    kitDefault: "Not locked. Needs obj-btn-destructive.",
    exists: "Deletes/archives often have no confirm. Danger styling is one-off.",
    suggest: "Confirm in a viewport-capped dialog. Action uses sg-btn-danger once that object exists. Cancel is ghost.",
    status: "gap",
  },
  {
    id: "beh-unsaved",
    layer: "behaviour",
    title: "Unsaved",
    use: "Explicit Save (Kanban notes) unless a leaf documents autosave",
    kitDefault: "No warn-on-navigate yet.",
    exists: "Kanban notes and Dev choices are explicit Save. MRT plan edits save with the product store (no abandon warning).",
    suggest: "Keep explicit Save on studio desks (Kanban, Drop, Dev choices). Product leaves may autosave if the leaf says so. No global beforeunload yet.",
    status: "gap",
  },
  {
    id: "beh-a11y",
    layer: "behaviour",
    title: "Focus and a11y",
    use: "Skip link, visible focus, 32px controls, Esc on dialogs",
    kitDefault: "Locked in STANDARDS.md / checklist.",
    status: "kit",
  },
  {
    id: "beh-disabled-vs-hidden",
    layer: "behaviour",
    title: "Disabled vs hidden",
    use: "Guests hide chrome (MRT). Staff disable pending controls.",
    kitDefault: "Not a single rule yet.",
    exists: "MRT guests hide chrome. Pending buttons disable + opacity. Some MRT read-only uses pointer-events none + 0.72 opacity.",
    suggest: "Unauthorised: hide. In-flight: disable. Read-only review: disable, do not hide the fields.",
    status: "gap",
  },
  {
    id: "beh-hover",
    layer: "behaviour",
    title: "Hover vs click",
    use: "sg-card hover darkens border",
    kitDefault: "Cards look clickable even when they are not.",
    exists: "sg-card:hover darkens border globally, including static Process and library cards.",
    suggest: "Same as obj-card: sg-card-static for non-interactive. Hover only when the card is a door or a row you can open.",
    status: "conflict",
    notes: "May need a quiet card variant for non-interactive blocks.",
  },
  {
    id: "beh-copy",
    layer: "behaviour",
    title: "Button copy",
    use: "Verbs: Save, Cancel, Raise, Add. Not colour-as-meaning for Submit.",
    kitDefault: "Ink primary is the one commit action, whatever the label.",
    status: "kit",
  },
];

export function libraryByLayer(layer: LibraryLayer): LibraryEntry[] {
  return LIBRARY_SEED.filter((row) => row.layer === layer);
}

export function libraryNeedingDecision(): LibraryEntry[] {
  return LIBRARY_SEED.filter((row) => row.status === "conflict" || row.status === "gap");
}

export function libraryTabFor(row: LibraryEntry): "design" | "behaviours" {
  return row.layer === "behaviour" ? "behaviours" : "design";
}

export function currentText(row: LibraryEntry): string {
  return row.current ?? row.kitDefault;
}
