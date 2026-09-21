import { UiLoadingSpinner } from "@/core/shell/UiLoading";

/** Pane wait only — leaf chrome (PageNav, title, L1 tabs) stays in the layout. */
export function MtgBuylistPaneLoading() {
  return (
    <div
      className="flex min-h-[12rem] flex-1 items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <UiLoadingSpinner />
    </div>
  );
}
