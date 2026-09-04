export default function MtgBuylistLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <div className="h-8 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
      <p className="text-sm text-[var(--muted)]">Loading MTG Buylist…</p>
      <div className="sg-card h-28 animate-pulse" />
      <div className="sg-card h-28 animate-pulse" />
      <div className="sg-card h-28 animate-pulse" />
    </div>
  );
}
