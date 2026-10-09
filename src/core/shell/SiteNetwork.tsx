"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";
import type { RegistryNode } from "@/core/contracts/types";
import { ShellModal } from "@/core/shell/ShellModal";
import { SiteNetworkNestedList } from "@/core/shell/SiteNetworkTree";
import { codeBadgeColor } from "@/core/registry";

type Props = {
  hubs: RegistryNode[];
  childrenByHub: Record<string, RegistryNode[]>;
  currentHref: string;
};

export function SiteNetwork({ hubs, childrenByHub, currentHref }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const onClose = useCallback(() => setOpen(false), []);

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
      <ShellModal
        open={open}
        titleId={titleId}
        onClose={onClose}
        panelClassName="max-w-lg"
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
          <button type="button" className="sg-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <SiteNetworkNestedList
          hubs={hubs}
          childrenByHub={childrenByHub}
          home={
            <MapLink
              href="/home"
              label="Home"
              current={currentHref === "/home"}
              onNavigate={onClose}
            />
          }
          renderHub={(hub) => (
            <MapLink
              href={hub.href}
              label={hub.title}
              current={currentHref === hub.href}
              badge={hub}
              onNavigate={onClose}
            />
          )}
          renderChild={(child) => (
            <MapLink
              href={child.href}
              label={child.title}
              current={currentHref === child.href}
              badge={child}
              onNavigate={onClose}
            />
          )}
        />
      </ShellModal>
    </>
  );
}

function ColorMark({ code }: { code: string }) {
  const hex = codeBadgeColor(code);
  return (
    <span className="group/swatch relative inline-flex shrink-0" title={hex}>
      <span
        className="inline-block h-3.5 w-3.5 rounded-[4px]"
        style={{ backgroundColor: hex }}
        aria-label={hex}
      />
      <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-1 hidden -translate-y-1/2 whitespace-nowrap rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] leading-none text-[var(--ink)] shadow-sm group-hover/swatch:block">
        {hex}
      </span>
    </span>
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
        badge?.pendingDelete ? "opacity-60 grayscale" : ""
      } ${
        current
          ? "bg-[var(--ink)] text-[var(--surface)]"
          : "text-[var(--ink)] hover:bg-[var(--surface-muted)]"
      }`}
    >
      {badge ? <ColorMark code={badge.code} /> : null}
      <span className="font-medium">{label}</span>
      {badge?.pendingDelete ? (
        <span className="text-xs opacity-80">To delete</span>
      ) : null}
      {current ? (
        <span className="ml-auto text-xs opacity-80">You are here</span>
      ) : null}
    </Link>
  );
}
