"use client";

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
  const selectedTitle =
    options.find((row) => row.id === value)?.title ??
    (value === KANBAN_GLOBAL_NODE_ID ? "Global" : value);

  return (
    <div className="block text-sm font-medium">
      {label}
      {id ? <input type="hidden" id={id} value={value} readOnly /> : null}
      <p className="mt-1 text-xs font-normal text-[var(--muted)]">
        {selectedTitle}
      </p>
      <div className="mt-2 rounded-[10px] border border-[var(--border)] p-2">
        <SiteNetworkNestedList
          hubs={hubs}
          childrenByHub={childrenByHub}
          home={
            <PickRow
              label="Global"
              selected={value === KANBAN_GLOBAL_NODE_ID}
              onPick={() => onChange(KANBAN_GLOBAL_NODE_ID)}
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
                onPick={() => onChange(child.id)}
              />
            )
          }
        />
      </div>
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
