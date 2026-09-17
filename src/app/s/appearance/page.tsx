import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";

const tokens = [
  { name: "--ink", value: "#3C3C3B", note: "Logo charcoal — text & primary" },
  { name: "--page", value: "#F5F5F4", note: "Page ground" },
  { name: "--surface", value: "#FFFFFF", note: "Cards / surfaces" },
  { name: "--surface-muted", value: "#ECECEC", note: "Hover wash, pill fill" },
  { name: "--border", value: "#D4D4D2", note: "Hairline borders" },
  { name: "--muted", value: "#6B6B69", note: "Secondary text" },
  { name: "--rag-green", value: "#2F8F4E", note: "Status / data wash — not button fill" },
  { name: "--rag-amber", value: "#D4A017", note: "Status / data wash — not button fill" },
  { name: "--rag-red", value: "#C0392B", note: "Status / data wash — not button fill" },
  { name: "font", value: "Manrope", note: "Geometric sans" },
  { name: "radius", value: "10px", note: "Cards & controls" },
  { name: "--sg-btn-height", value: "32px", note: "Buttons, inputs, tabs — Kanban LAYOUT toggle" },
];

export default function AppearancePage() {
  return (
    <AppShell currentHref="/s/appearance">
      <PageNav href="/s/appearance" />
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Appearance</h1>
        <p className="mt-2 max-w-xl text-[var(--muted)]">
          Token values for the global SG theme. Live swatches, type ramp, and
          pickers live on{" "}
          <a href="/s/standards?tab=design" className="underline underline-offset-2">
            Standards → Design Library
          </a>
          . Sub-hub hex codes colour badges only — not the page theme.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {tokens.map((t) => (
          <li key={t.name} className="sg-card">
            <div className="mb-2 flex items-center gap-3">
              {t.value.startsWith("#") ? (
                <span
                  className="h-8 w-8 rounded-md border border-[var(--border)]"
                  style={{ backgroundColor: t.value }}
                />
              ) : null}
              <div>
                <p className="font-mono text-sm font-semibold">{t.name}</p>
                <p className="font-mono text-xs text-[var(--muted)]">{t.value}</p>
              </div>
            </div>
            <p className="text-sm text-[var(--muted)]">{t.note}</p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
