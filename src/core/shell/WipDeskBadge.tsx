import { wipDeskLabel } from "@/core/desk";

/** Yellow development badge. Only when `WIP_DESK` is set on this localhost desk. */
export function WipDeskBadge() {
  const label = wipDeskLabel();
  if (!label) return null;
  return (
    <span
      className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--rag-amber)_55%,var(--ink))] bg-[color-mix(in_srgb,var(--rag-amber)_32%,var(--surface))] px-2 py-0.5 text-xs font-semibold text-[var(--ink)]"
      title={`WIP desk ${label}`}
    >
      {label}
    </span>
  );
}
