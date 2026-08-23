"use client";

import { useEffect, useRef, useState } from "react";

export type FilterCheckItem = { id: string; label: string };

export function FilterChecklist({
  items,
  selected,
  onChange,
}: {
  items: FilterCheckItem[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const allIds = items.map((i) => i.id);
  const allOn = allIds.length > 0 && allIds.every((id) => selected.includes(id));
  const noneOn = selected.length === 0;

  return (
    <div className="mrt-filter-check">
      <div className="mrt-filter-check-actions">
        <label className="flex items-center gap-1 py-0.5 text-xs">
          <input
            type="checkbox"
            checked={allOn}
            onChange={() => onChange([...allIds])}
          />
          Select all
        </label>
        <label className="flex items-center gap-1 py-0.5 text-xs">
          <input
            type="checkbox"
            checked={noneOn}
            onChange={() => onChange([])}
          />
          Clear all
        </label>
      </div>
      {items.map((item) => (
        <label key={item.id} className="flex items-center gap-1 py-0.5 text-xs">
          <input
            type="checkbox"
            checked={selected.includes(item.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...selected, item.id]
                  : selected.filter((id) => id !== item.id),
              )
            }
          />
          {item.label}
        </label>
      ))}
    </div>
  );
}

export function FilterChecklistField({
  items,
  selected,
  onChange,
}: {
  items: FilterCheckItem[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const allOn = items.length > 0 && items.every((i) => selected.includes(i.id));
  const label =
    selected.length === 0 ? "None" : allOn ? "All" : `${selected.length} selected`;

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as HTMLElement;
      if (root.current?.contains(t)) return;
      setOpen(false);
    }
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={root} className="mrt-overlay-anchor" data-mrt-overlay>
      <button
        type="button"
        className="mrt-select w-full text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open ? (
        <div className="mrt-overlay-pop">
          <FilterChecklist items={items} selected={selected} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}
