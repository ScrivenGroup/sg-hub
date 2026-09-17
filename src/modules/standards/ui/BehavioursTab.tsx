export function BehavioursTab() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-[var(--muted)]">
        Dialogs live in the Design Library. These states are the kit.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sg-card space-y-2">
          <p className="text-sm font-medium">Page width</p>
          <p className="text-sm text-[var(--muted)]">
            Fill the frame. Cap reading text, not the page.
          </p>
        </div>
        <div className="sg-card space-y-2">
          <p className="text-sm font-medium">Pending</p>
          <button type="button" className="sg-btn-primary opacity-50" disabled>
            Saving…
          </button>
        </div>
        <div className="sg-card space-y-2">
          <p className="text-sm font-medium">Empty</p>
          <p className="text-sm text-[var(--muted)]">No version rows yet.</p>
        </div>
        <div className="sg-card space-y-2">
          <p className="text-sm font-medium">Field error</p>
          <p className="text-sm text-[var(--rag-red)]">Layer required</p>
        </div>
        <div className="sg-card space-y-2">
          <p className="text-sm font-medium">Guest</p>
          <p className="text-sm text-[var(--muted)]">Hide chrome. Do not disable-in-place.</p>
        </div>
      </div>
    </div>
  );
}
