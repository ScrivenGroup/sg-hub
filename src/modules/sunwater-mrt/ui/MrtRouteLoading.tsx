import Image from "next/image";
import { MrtLoadingPane } from "./MrtLoadingPane";
import { MRT_VERSION, MRT_VERSION_WHEN } from "../version";

/** Instant chrome while `/w/sunwater-mrt` RSC is still on the way. No auth wait. */
export function MrtRouteLoading() {
  return (
    <div
      className="flex min-h-dvh flex-col bg-[var(--page)] text-[var(--ink)]"
      aria-busy="true"
      aria-live="polite"
    >
      <header className="sticky top-0 z-40 shrink-0 border-b border-[var(--border)] bg-[var(--surface)]/95">
        <div className="flex items-center gap-3 px-4 py-2">
          <Image
            src="/logo.png"
            alt="Scriven Group"
            width={36}
            height={36}
            className="rounded-md"
            priority
          />
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight sm:text-lg">
            Sunwater - Milestone Resourcing Tracker
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">
              v{MRT_VERSION}
              <span className="ml-1.5 font-normal">{MRT_VERSION_WHEN}</span>
            </span>
          </h1>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-3 pt-0">
        <MrtLoadingPane
          step={1}
          total={2}
          label="Sunwater MRT"
          showDevelopment
        />
      </main>
    </div>
  );
}
