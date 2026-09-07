"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  titleId: string;
  onClose: () => void;
  panelClassName?: string;
  bodyClassName?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function ShellModal({
  open,
  titleId,
  onClose,
  panelClassName,
  bodyClassName,
  footer,
  children,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const withFooter = footer != null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`${
            withFooter
              ? "flex max-h-[min(90dvh,calc(100dvh-1.5rem))] flex-col overflow-hidden"
              : "max-h-[min(90dvh,calc(100dvh-1.5rem))] overflow-auto"
          } w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl ${panelClassName ?? "max-w-lg"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {withFooter ? (
            <>
              <div className={`min-h-0 flex-1 ${bodyClassName ?? "overflow-y-auto"}`}>
                {children}
              </div>
              <div className="mt-3 shrink-0 border-t border-[var(--border)] pt-3">
                {footer}
              </div>
            </>
          ) : (
            children
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
