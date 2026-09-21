"use client";

import { useCallback, useState } from "react";
import { flushSync } from "react-dom";

/** Two animation frames so the browser can paint before/after heavy work. */
export function waitPainted(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Show a spinner, wait for paint, run work, wait for that paint, then hide. */
export async function runPaintedBusy(
  setBusy: (busy: boolean) => void,
  work: () => void | Promise<void>,
): Promise<void> {
  flushSync(() => setBusy(true));
  await waitPainted();
  try {
    await work();
  } finally {
    await waitPainted();
    setBusy(false);
  }
}

export function usePaintedBusy() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const run = useCallback(async (id: string, work: () => void | Promise<void>) => {
    await runPaintedBusy((v) => setBusyId(v ? id : null), work);
  }, []);
  return { busyId, run };
}

export function BusySpin({ on }: { on: boolean }) {
  if (!on) return null;
  return <span className="mrt-inline-loading-spin" aria-hidden />;
}
