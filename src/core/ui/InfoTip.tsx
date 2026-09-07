/** Native-title (i) for copy we still need but should not occupy the page. */
export function InfoTip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-[var(--border)] text-[10px] font-semibold leading-none text-[var(--muted)]"
      title={label}
      aria-label={label}
      role="img"
    >
      i
    </span>
  );
}
