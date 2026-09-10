"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type Identity = {
  name: string;
  setCode?: string;
  collectorNumber?: string;
  finish?: string;
};

type Props = Identity & {
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
/** Fixed so O / S (and M / P) sit at the same offset when you hop chips. */
const CAPTION_H = 62;

function titleCaseFinish(finish?: string): string {
  const raw = (finish || "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase();
  if (key === "nf" || key === "nonfoil" || key === "non-foil" || key === "normal") {
    return "Nonfoil";
  }
  if (key === "f" || key === "foil") return "Foil";
  if (key === "et" || key === "etched") return "Etched";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function identityParts(
  setCode?: string,
  collectorNumber?: string,
  finish?: string,
): string[] {
  const parts: string[] = [];
  const set = (setCode || "").trim();
  const cn = (collectorNumber || "").trim();
  const fin = titleCaseFinish(finish);
  if (set) parts.push(set.toUpperCase());
  if (cn) parts.push(`#${cn}`);
  if (fin) parts.push(fin);
  return parts;
}

function PreviewIcon({
  label,
  ariaLabel,
  url,
  letter,
  name,
  setCode,
  collectorNumber,
  finish,
}: Identity & {
  label: string;
  ariaLabel?: string;
  url: string;
  letter: string;
}) {
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();
  const meta = identityParts(setCode, collectorNumber, finish);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hide = useCallback(() => setAnchor(null), []);

  const show = useCallback((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const panelH = PREVIEW_H + CAPTION_H;
    let left = r.left;
    if (left + PREVIEW_W > window.innerWidth - 8) {
      left = window.innerWidth - PREVIEW_W - 8;
    }
    if (left < 8) left = 8;
    const roomAbove = r.top >= panelH + 16;
    const top = roomAbove
      ? r.top - panelH - 8
      : Math.min(r.bottom + 8, Math.max(8, window.innerHeight - panelH - 8));
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
        aria-label={ariaLabel || label}
        aria-describedby={anchor ? panelId : undefined}
        className={`inline-flex h-5 w-5 cursor-default items-center justify-center rounded border border-[var(--border)] text-[10px] font-semibold ${
          url
            ? "bg-[var(--surface)] text-[var(--ink)]"
            : "text-[var(--muted)]"
        }`}
      >
        {letter}
      </button>
      {mounted && anchor
        ? createPortal(
            <div
              id={panelId}
              role="tooltip"
              className="pointer-events-none overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
              style={{
                position: "fixed",
                left: `${anchor.left}px`,
                top: `${anchor.top}px`,
                width: `${PREVIEW_W}px`,
                zIndex: 2147483000,
              }}
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={name}
                  width={PREVIEW_W}
                  height={PREVIEW_H}
                  style={{
                    display: "block",
                    width: `${PREVIEW_W}px`,
                    height: `${PREVIEW_H}px`,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  className="flex items-center justify-center text-sm text-[var(--muted)]"
                  style={{ width: PREVIEW_W, height: PREVIEW_H }}
                >
                  No image
                </div>
              )}
              <div
                className="flex flex-col justify-center gap-0.5 border-t border-[var(--border)] px-2.5 py-1.5 font-[family-name:var(--font-sans)]"
                style={{ minHeight: CAPTION_H }}
              >
                <p className="text-[11px] leading-4 text-[var(--muted)]">{label}</p>
                <p className="text-[13px] font-medium leading-4 text-[var(--ink)]">{name}</p>
                {meta.length ? (
                  <p className="flex flex-wrap items-baseline gap-x-1.5 text-[11px] leading-4 text-[var(--muted)]">
                    {meta.map((part, i) => (
                      <span key={`${part}-${i}`} className="inline-flex items-baseline gap-x-1.5">
                        {i > 0 ? (
                          <span aria-hidden className="text-[var(--border)]">
                            ·
                          </span>
                        ) : null}
                        <span className="tabular-nums">{part}</span>
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
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
  setCode,
  collectorNumber,
  finish,
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
  const identity = { name, setCode, collectorNumber, finish };
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {showOwned ? (
        <PreviewIcon
          label="Owned"
          ariaLabel="Owned (CSV / Scryfall)"
          url={ownedImageUrl}
          letter="O"
          {...identity}
        />
      ) : null}
      {compareMode ? (
        <>
          {showMate ? (
            <PreviewIcon
              label="Mate"
              ariaLabel="Mate match"
              url={mateImageUrl || ""}
              letter="M"
              {...identity}
            />
          ) : null}
          {showPlaymantis ? (
            <PreviewIcon
              label="Playmantis"
              ariaLabel="Playmantis match"
              url={playmantisImageUrl || ""}
              letter="P"
              {...identity}
            />
          ) : null}
        </>
      ) : showStore && storeImageUrl ? (
        <PreviewIcon
          label="Store"
          ariaLabel="Store match"
          url={storeImageUrl}
          letter="S"
          {...identity}
        />
      ) : null}
      <span className="whitespace-nowrap font-medium">{name}</span>
    </span>
  );
}
