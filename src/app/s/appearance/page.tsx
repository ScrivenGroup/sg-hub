import { AppShell } from "@/core/shell/AppShell";
import { AppearanceTokens } from "@/core/shell/AppearanceTokens";
import { PageNav } from "@/core/shell/PageNav";
import { PendingDeleteNote } from "@/core/shell/PendingDeleteNote";

export default function AppearancePage() {
  return (
    <AppShell currentHref="/s/appearance">
      <PageNav href="/s/appearance" />
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Appearance</h1>
        <PendingDeleteNote />
        <p className="mt-2 max-w-xl text-[var(--muted)]">
          Token values for the global SG theme. Live swatches, type ramp, and
          pickers live on{" "}
          <a href="/s/standards?tab=design" className="underline underline-offset-2">
            Standards → Design Library
          </a>
          . Sub-hub hex codes colour badges only — not the page theme.
        </p>
      </header>
      <AppearanceTokens />
    </AppShell>
  );
}
