"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { RegistryNode } from "@/core/contracts/types";
import { siteNetworkTree } from "@/core/registry";
import { SiteNetworkNestedList } from "@/core/shell/SiteNetworkTree";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { KANBAN_GLOBAL_NODE_ID } from "../schema";
import type { KanbanLeafOption } from "../leaves";

const pickClass = (selected: boolean) =>
  `flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
    selected
      ? "bg-[var(--ink)] text-[var(--surface)]"
      : "text-[var(--ink)] hover:bg-[var(--surface-muted)]"
  }`;

function PickRow({
  label,
  selected,
  badge,
  onPick,
}: {
  label: string;
  selected: boolean;
  badge?: RegistryNode;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={pickClass(selected)}
      onClick={onPick}
    >
      <span className="font-medium">{label}</span>
      {badge ? <CodeBadge node={badge} /> : null}
      {selected ? (
        <span className="ml-auto text-xs opacity-80">Selected</span>
      ) : null}
    </button>
  );
}

export function LeafTagSelect({
  value,
  onChange,
  options,
  id,
  label = "Leaf tag",
}: {
  value: string;
  onChange: (nodeId: string) => void;
  options: KanbanLeafOption[];
  id?: string;
  label?: string;
}) {
  const { hubs, childrenByHub } = siteNetworkTree();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const selectedTitle =
    options.find((row) => row.id === value)?.title ??
    (value === KANBAN_GLOBAL_NODE_ID ? "Global" : value);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function pick(nodeId: string) {
    onChange(nodeId);
    setOpen(false);
  }

  return (
    <div className="block shrink-0 text-sm font-medium">
      {label}
      {id ? <input type="hidden" id={id} value={value} readOnly /> : null}
      <button
        type="button"
        className="sg-input mt-1 flex w-full items-center justify-between gap-2 text-left font-normal"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span>{selectedTitle}</span>
        <span className="text-xs text-[var(--muted)]">Change</span>
      </button>
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:items-center sm:p-4"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Leaf tag"
                className="max-h-[min(70dvh,calc(100dvh-2rem))] w-full max-w-md overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="mb-2 text-sm font-medium">Tag this note</p>
                <SiteNetworkNestedList
                  hubs={hubs}
                  childrenByHub={childrenByHub}
                  home={
                    <PickRow
                      label="Global"
                      selected={value === KANBAN_GLOBAL_NODE_ID}
                      onPick={() => pick(KANBAN_GLOBAL_NODE_ID)}
                    />
                  }
                  renderHub={(hub) => (
                    <div className="rounded-md px-2 py-1.5 text-sm font-medium text-[var(--muted)]">
                      {hub.title}
                    </div>
                  )}
                  renderChild={(child) =>
                    child.kind === "hub" ? (
                      <div className="rounded-md px-2 py-1.5 text-sm font-medium text-[var(--muted)]">
                        {child.title}
                      </div>
                    ) : (
                      <PickRow
                        label={child.title}
                        selected={value === child.id}
                        badge={child}
                        onPick={() => pick(child.id)}
                      />
                    )
                  }
                />
                <button
                  type="button"
                  className="sg-btn-ghost mt-3"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function LeafTagBadge({
  nodeId,
  options,
}: {
  nodeId: string;
  options: KanbanLeafOption[];
}) {
  const title = options.find((row) => row.id === nodeId)?.title ?? nodeId;
  return (
    <span className="inline-block shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
      {title}
    </span>
  );
}
