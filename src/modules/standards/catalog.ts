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
    status: "conflict",
    notes: "In globals.css. Appearance page does not list it yet.",
    conflicts: [
      {
        leaf: "Appearance",
        where: "src/app/s/appearance/page.tsx",
        instead: "Token list omits --surface-muted and RAG",
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
    status: "kit",
    notes: "RagDot + Definition attention. Hex on a leaf badge is a different job.",
  },
  {
    id: "tok-radius",
    layer: "token",
    title: "Radius",
    use: "--radius",
    kitDefault: "10px",
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
    status: "gap",
    notes: "ShellModal uses shadow-xl. No named token.",
  },
  {
    id: "tok-icon",
    layer: "token",
    title: "Iconography",
    use: "(none)",
    kitDefault: "No icon set. InfoTip is a letter i.",
    status: "gap",
  },
  {
    id: "obj-btn-primary",
    layer: "object",
    title: "Primary button",
    use: "sg-btn-primary",
    kitDefault: "Ink fill, no border, 10px radius, 32px height. One commit action per row.",
    status: "conflict",
    notes: "If you decide “always borders on buttons”, that decision lives here. Kit default stays visible.",
    conflicts: [
      {
        leaf: "Sunwater MRT",
        where: ".mrt-btn-primary",
        instead: "Ink fill plus 1px ink border, 8px radius",
      },
    ],
  },
  {
    id: "obj-btn-secondary",
    layer: "object",
    title: "Secondary button",
    use: "sg-btn-secondary",
    kitDefault: "Surface fill, 1px --border, hover darkens border to ink",
    status: "conflict",
    conflicts: [
      {
        leaf: "Sunwater MRT",
        where: ".mrt-btn-secondary",
        instead: "Same job, 8px radius, leaf CSS",
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
    status: "kit",
  },
  {
    id: "obj-card",
    layer: "object",
    title: "Card",
    use: "sg-card",
    kitDefault: "Surface, 1px border, 10px radius, 1.25rem padding. Hover darkens border to ink.",
    status: "kit",
    notes: "Hover-as-affordance may be wrong on dense tables — decide on beh-hover.",
  },
  {
    id: "obj-tab",
    layer: "object",
    title: "Tab",
    use: "sg-tab",
    kitDefault: "Underline, not pills. aria-selected / aria-current paints the ink underline.",
    status: "kit",
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
    id: "obj-dialog",
    layer: "object",
    title: "Dialog",
    use: "EffortPopupShell (viewport-capped) — ShellModal is the chrome/kanban dialog",
    kitDefault:
      "PLATFORM: fixed inset-0 grid overlay, flex column dialog, scrollport min-height 0. Esc closes. Footer stays.",
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
    status: "gap",
  },
  {
    id: "beh-dialogs",
    layer: "behaviour",
    title: "Dialogs",
    use: "Esc closes; viewport-capped; footer stays",
    kitDefault: "PLATFORM overlay rules.",
    status: "conflict",
    notes: "Tied to obj-dialog. Overlay-click-to-close is ShellModal yes, Effort popup no.",
  },
  {
    id: "beh-tables",
    layer: "behaviour",
    title: "Tables",
    use: "overflow-x; muted headers; tabular numbers",
    kitDefault: "No sticky header rule yet. MRT Gantt can hide columns.",
    status: "gap",
  },
  {
    id: "beh-destructive",
    layer: "behaviour",
    title: "Destructive confirm",
    use: "Confirm before delete/archive. Not a primary ink button.",
    kitDefault: "Not locked. Needs obj-btn-destructive.",
    status: "gap",
  },
  {
    id: "beh-unsaved",
    layer: "behaviour",
    title: "Unsaved",
    use: "Explicit Save (Kanban notes) unless a leaf documents autosave",
    kitDefault: "No warn-on-navigate yet.",
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
    status: "gap",
  },
  {
    id: "beh-hover",
    layer: "behaviour",
    title: "Hover vs click",
    use: "sg-card hover darkens border",
    kitDefault: "Cards look clickable even when they are not.",
    status: "kit",
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

export function currentText(row: LibraryEntry): string {
  return row.current ?? row.kitDefault;
}
