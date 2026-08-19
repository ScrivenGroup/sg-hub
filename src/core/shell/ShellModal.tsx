"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  titleId: string;
  onClose: () => void;
  panelClassName?: string;
  children: ReactNode;
};

export function ShellModal({
  open,
  titleId,
  onClose,
  panelClassName,
  children,
}: Props) {
  const [mounted, setMounted] = useState(false);

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
          className={`max-h-[min(90dvh,calc(100dvh-1.5rem))] w-full overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl ${panelClassName ?? "max-w-lg"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
