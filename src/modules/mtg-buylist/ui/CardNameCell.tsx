"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  name: string;
  /** ManaBox / Scryfall — “the card I own”. */
  ownedImageUrl?: string;
  /** Single-store table: that store’s matched printing. */
  storeImageUrl?: string;
  /** Compare table: Mate matched printing. */
  mateImageUrl?: string;
  /** Compare table: Playmantis matched printing. */
  playmantisImageUrl?: string;
  showOwned?: boolean;
  showStore?: boolean;
  showMate?: boolean;
  showPlaymantis?: boolean;
};

/** MTG card face ≈ 63×88 mm → keep 5:7, independent of the 20px trigger. */
const PREVIEW_W = 200;
const PREVIEW_H = 280;

function PreviewIcon({
  label,
  url,
  letter,
}: {
  label: string;
  url: string;
  letter: string;
}) {
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const hide = useCallback(() => setAnchor(null), []);

  const show = useCallback((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    let left = r.left;
    if (left + PREVIEW_W > window.innerWidth - 8) {
      left = window.innerWidth - PREVIEW_W - 8;
    }
    if (left < 8) left = 8;
    const roomAbove = r.top >= PREVIEW_H + 16;
    const top = roomAbove ? r.top - PREVIEW_H - 8 : r.bottom + 8;
    setAnchor({ left, top });
  }, []);

  useEffect(() => {
    if (!anchor) return;
    const onReposition = () => setAnchor(null);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [anchor]);

  if (!url) {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--border)] text-[10px] text-[var(--muted)]"
        title={`${label}: no image`}
      >
        {letter}
      </span>
    );
  }

  return (
    <span
      className="relative inline-flex h-5 w-5 shrink-0"
      onMouseEnter={(e) => show(e.currentTarget)}
      onMouseLeave={hide}
      onFocus={(e) => show(e.currentTarget)}
      onBlur={hide}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={anchor ? panelId : undefined}
        className="inline-flex h-5 w-5 cursor-default items-center justify-center rounded border border-[var(--border)] bg-[var(--surface)] text-[10px] font-semibold text-[var(--ink)]"
      >
        {letter}
      </button>
      {mounted && anchor
        ? createPortal(
            <div
              id={panelId}
              role="tooltip"
              className="pointer-events-none rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
              style={{
                position: "fixed",
                left: `${anchor.left}px`,
                top: `${anchor.top}px`,
                width: `${PREVIEW_W}px`,
                height: `${PREVIEW_H}px`,
                minWidth: `${PREVIEW_W}px`,
                minHeight: `${PREVIEW_H}px`,
                zIndex: 2147483000,
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={label}
                width={PREVIEW_W}
                height={PREVIEW_H}
                style={{
                  display: "block",
                  width: `${PREVIEW_W}px`,
                  height: `${PREVIEW_H}px`,
                  objectFit: "cover",
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

/** Card name with hover previews. O = owned; S = store; on Compare: M = Mate, P = Playmantis. */
export function CardNameCell({
  name,
  ownedImageUrl = "",
  storeImageUrl = "",
  mateImageUrl,
  playmantisImageUrl,
  showOwned = true,
  showStore = true,
  showMate = true,
  showPlaymantis = true,
}: Props) {
  const compareMode = mateImageUrl !== undefined || playmantisImageUrl !== undefined;
  return (
    <span className="inline-flex items-center gap-1.5">
      {showOwned ? (
        <PreviewIcon label="Owned (CSV / Scryfall)" url={ownedImageUrl} letter="O" />
      ) : null}
      {compareMode ? (
        <>
          {showMate ? (
            <PreviewIcon label="Mate match" url={mateImageUrl || ""} letter="M" />
          ) : null}
          {showPlaymantis ? (
            <PreviewIcon label="Playmantis match" url={playmantisImageUrl || ""} letter="P" />
          ) : null}
        </>
      ) : showStore && storeImageUrl ? (
        <PreviewIcon label="Store match" url={storeImageUrl} letter="S" />
      ) : null}
      <span className="font-medium">{name}</span>
    </span>
  );
}
