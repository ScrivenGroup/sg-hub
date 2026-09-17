"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Shared wait card — route loading, L1 tab switch, and in-page work. */
export function MtgBuylistPending({
  status,
  detail,
}: {
  status: string;
  detail?: string;
}) {
  return (
    <div className="sg-card max-w-md space-y-3 shadow-2xl" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <span
          className="inline-block h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-[var(--muted)] border-t-[var(--ink)]"
          aria-hidden
        />
        <p className="font-medium">{status}</p>
      </div>
      {detail ? <p className="text-sm text-[var(--muted)]">{detail}</p> : null}
    </div>
  );
}

export function MtgBuylistPendingOverlay({
  open,
  status,
  detail,
}: {
  open: boolean;
  status: string;
  detail?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!open || !mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-[color-mix(in_srgb,var(--ink)_40%,transparent)] p-4"
      role="alertdialog"
      aria-busy="true"
      aria-live="assertive"
      aria-label={status}
    >
      <MtgBuylistPending status={status} detail={detail} />
    </div>,
    document.body,
  );
}

export function MtgBuylistRouteLoading({ status }: { status: string }) {
  return (
    <div className="flex w-full min-w-0 justify-center px-4 py-16">
      <MtgBuylistPending
        status={status}
        detail="Run, Logs, and Development share this wait state."
      />
    </div>
  );
}
