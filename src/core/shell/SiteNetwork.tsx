"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { RegistryNode } from "@/core/contracts/types";
import { CodeBadge } from "@/core/ui/CodeBadge";

type Props = {
  hubs: RegistryNode[];
  childrenByHub: Record<string, RegistryNode[]>;
  currentHref: string;
};

export function SiteNetwork({ hubs, childrenByHub, currentHref }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="sg-btn-ghost"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        Site network
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div className="flex min-h-full items-start justify-center sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[min(90dvh,calc(100dvh-1.5rem))] w-full max-w-lg overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="text-lg font-semibold text-[var(--ink)]">
                  Site network
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Fast travel — Home to Hubs to sub-hubs.
                </p>
              </div>
              <button
                type="button"
                className="sg-btn-ghost"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <ul className="space-y-3">
              <li>
                <MapLink
                  href="/home"
                  label="Home"
                  current={currentHref === "/home"}
                  onNavigate={() => setOpen(false)}
                />
              </li>
              {hubs.map((hub) => (
                <li key={hub.id} className="space-y-1">
                  <MapLink
                    href={hub.href}
                    label={hub.title}
                    current={currentHref === hub.href}
                    onNavigate={() => setOpen(false)}
                  />
                  <ul className="ml-4 space-y-1 border-l border-[var(--border)] pl-3">
                    {(childrenByHub[hub.id] ?? []).map((child) => (
                      <li key={child.id}>
                        <MapLink
                          href={child.href}
                          label={child.title}
                          current={currentHref === child.href}
                          badge={child}
                          onNavigate={() => setOpen(false)}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MapLink({
  href,
  label,
  current,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  current: boolean;
  badge?: RegistryNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
        current
          ? "bg-[var(--ink)] text-[var(--surface)]"
          : "text-[var(--ink)] hover:bg-[var(--surface-muted)]"
      }`}
    >
      <span className="font-medium">{label}</span>
      {badge ? <CodeBadge node={badge} /> : null}
      {current ? (
        <span className="ml-auto text-xs opacity-80">You are here</span>
      ) : null}
    </Link>
  );
}
