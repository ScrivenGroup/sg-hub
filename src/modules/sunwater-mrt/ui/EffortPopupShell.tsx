"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EffortScrollCtx, type EffortFreeze } from "./effort-scroll-context";

/** Viewport-capped dialog: grid overlay (minmax 0, 1fr) + flex column max-height 100%.
 *  Must override .sg-card { display:block }. Scroll the body (flex 1 1 0%), not the card.
 *  Do not use flex items-center + max-height alone — the card will grow past the window. */
export function EffortPopupShell({
  title,
  subtitle,
  onClose,
  toolbar,
  footer,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const xRoot = useRef<HTMLDivElement>(null);
  const panDownRef = useRef<((e: PointerEvent) => void) | null>(null);
  const [frozenHost, setFrozenHost] = useState<HTMLDivElement | null>(null);
  const [chartHost, setChartHost] = useState<HTMLDivElement | null>(null);
  const [chromeTop, setChromeTop] = useState<HTMLDivElement | null>(null);
  const [chromeBottom, setChromeBottom] = useState<HTMLDivElement | null>(null);

  const freeze = useMemo<EffortFreeze>(
    () => ({ xRoot, frozenHost, chartHost, chromeTop, chromeBottom, panDownRef }),
    [frozenHost, chartHost, chromeTop, chromeBottom],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portaled week rows live in the DOM under chartHost but in a different React
  // tree, so React onPointerDown on chartHost never sees those clicks. Native
  // bubble on the clip does. Do not replace this with a class on the popup that
  // uses a descendant selector — that restyles every hour cell.
  useEffect(() => {
    const root = xRoot.current;
    if (!root) return;
    const onDown = (e: PointerEvent) => {
      panDownRef.current?.(e);
    };
    root.addEventListener("pointerdown", onDown);
    return () => root.removeEventListener("pointerdown", onDown);
  }, [chartHost]);

  return (
    <div className="mrt-effort-overlay">
      <div role="dialog" aria-modal="true" className="sg-card mrt-effort-popup" data-effort-week-root>
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] pb-2">
          <div className="min-w-0">
            {title}
            {subtitle}
          </div>
          <button type="button" className="sg-btn-ghost shrink-0" onClick={onClose}>
            Close
          </button>
        </div>
        {toolbar ? <div className="shrink-0 py-2">{toolbar}</div> : null}
        <EffortScrollCtx.Provider value={freeze}>
          <div ref={setChromeTop} className="mrt-effort-chrome-top shrink-0" />
          <div
            data-mrt-effort-body
            className="mrt-effort-popup-body min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          >
            <div className="mrt-effort-split">
              <div ref={setFrozenHost} className="mrt-effort-frozen" />
              <div ref={xRoot} className="mrt-effort-timescale">
                <div
                  ref={setChartHost}
                  data-effort-cam
                  onPointerDown={(e) => panDownRef.current?.(e.nativeEvent)}
                />
              </div>
            </div>
            <div ref={setChromeBottom} className="mrt-effort-chrome-bottom" />
            {children}
          </div>
        </EffortScrollCtx.Provider>
        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
    </div>
  );
}
