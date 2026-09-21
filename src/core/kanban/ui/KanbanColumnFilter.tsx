"use client";

import { useEffect, useRef } from "react";
import { KANBAN_CHROME } from "../chrome";
import {
  COLUMN_LABELS,
  DEFAULT_VISIBLE_COLUMNS,
  KANBAN_COLUMNS,
  type KanbanColumn,
} from "../schema";

export function defaultVisibleColumns(): KanbanColumn[] {
  return [...DEFAULT_VISIBLE_COLUMNS];
}

export function KanbanColumnFilter({
  visible,
  onChange,
}: {
  visible: KanbanColumn[];
  onChange: (next: KanbanColumn[]) => void;
}) {
  const selected = new Set(visible);
  const allOn = KANBAN_COLUMNS.every((col) => selected.has(col));
  const noneOn = visible.length === 0;
  const allRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (allRef.current) {
      allRef.current.indeterminate = !allOn && !noneOn;
    }
  }, [allOn, noneOn]);

  function toggle(col: KanbanColumn) {
    const next = new Set(selected);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    onChange(KANBAN_COLUMNS.filter((item) => next.has(item)));
  }

  return (
    <div
      role="group"
      aria-label="Visible Kanban columns"
      className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1"
    >
      <label className="flex items-center gap-1.5 text-xs font-medium">
        <input
          ref={allRef}
          type="checkbox"
          className="h-3.5 w-3.5 accent-[var(--ink)]"
          checked={allOn}
          onChange={() => onChange(allOn ? [] : [...KANBAN_COLUMNS])}
          aria-label={allOn ? "Hide all columns" : "Show all columns"}
        />
        {KANBAN_CHROME.labels.columnFilterAll}
      </label>
      {KANBAN_COLUMNS.map((col) => (
        <label key={col} className="flex items-center gap-1.5 text-xs font-medium">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[var(--ink)]"
            checked={selected.has(col)}
            onChange={() => toggle(col)}
          />
          {COLUMN_LABELS[col]}
        </label>
      ))}
    </div>
  );
}
