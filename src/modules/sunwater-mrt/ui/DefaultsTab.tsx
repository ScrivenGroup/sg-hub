"use client";

import { useState } from "react";
import type { ScheduleStore } from "../schema";
import { SubTabs } from "./SubTabs";

const SUBS = ["Lead-in time per dam", "Task+Resource Effort"] as const;

export function DefaultsTab({
  store,
  onChange,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
}) {
  const [sub, setSub] = useState<(typeof SUBS)[number]>("Lead-in time per dam");

  function update(mut: (next: ScheduleStore) => void) {
    const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    mut(next);
    onChange(next);
  }

  return (
    <div>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === "Lead-in time per dam" ? (
        <LeadMatrix store={store} update={update} />
      ) : (
        <div className="sg-card max-w-xl border-dashed">
          <h2 className="font-medium">Task+Resource Effort (hrs) per Obligation</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Follow-on plan. Assignment templates (roles × Week 1…N) will live
            here; not in this drop.
          </p>
        </div>
      )}
    </div>
  );
}

function LeadMatrix({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const lanes = store.lanes;
  const dams = store.dams;

  return (
    <div>
      <button
        type="button"
        className="mrt-btn-secondary mb-3"
        onClick={() => setFlipped((v) => !v)}
      >
        Flip axis
      </button>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Values are lead-in months before the due date. Blank on an asset uses
        the default column.
      </p>
      <div className="overflow-x-auto">
        {!flipped ? (
          <table className="mrt-table">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Asset</th>
                {lanes.map((l) => (
                  <th key={l.code} colSpan={2} className="px-2 py-1">
                    {l.code}
                  </th>
                ))}
              </tr>
              <tr className="text-[var(--muted)]">
                <th />
                {lanes.map((l) => (
                  <th key={`${l.code}-h`} colSpan={2} className="px-2 font-normal">
                    default {store.leadGeneral[l.code] ?? l.defLead}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[var(--border)] bg-[var(--surface-muted)]">
                <td className="px-2 py-1 font-medium">Default lead-in</td>
                {lanes.map((lane) => (
                  <td key={lane.code} colSpan={2} className="px-1">
                    <input
                      type="number"
                      min={0}
                      className="mrt-input w-16 text-center"
                      value={store.leadGeneral[lane.code] ?? lane.defLead}
                      onChange={(e) =>
                        update((n) => {
                          n.leadGeneral[lane.code] = Number(e.target.value) || 0;
                        })
                      }
                    />
                  </td>
                ))}
              </tr>
              {dams.map((dam) => (
                <tr key={dam.id} className="border-t border-[var(--border)]">
                  <td className="px-2 py-1">{dam.name}</td>
                  {lanes.map((lane) => (
                    <td key={lane.code} colSpan={2} className="px-1">
                      <input
                        type="number"
                        min={0}
                        className={`mrt-input w-16 text-center ${
                          store.leadOverrides[lane.code]?.[dam.id] != null
                            ? "overridden"
                            : ""
                        }`}
                        value={store.leadOverrides[lane.code]?.[dam.id] ?? ""}
                        placeholder={String(store.leadGeneral[lane.code] ?? "")}
                        onChange={(e) =>
                          update((n) => {
                            if (!n.leadOverrides[lane.code]) n.leadOverrides[lane.code] = {};
                            if (e.target.value === "") {
                              delete n.leadOverrides[lane.code][dam.id];
                            } else {
                              n.leadOverrides[lane.code][dam.id] =
                                Number(e.target.value) || 0;
                            }
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="mrt-table">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Obligation</th>
                <th className="px-2 py-1">Default</th>
                {dams.map((d) => (
                  <th key={d.id} className="px-2 py-1">
                    {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lanes.map((lane) => (
                <tr key={lane.code} className="border-t border-[var(--border)]">
                  <td className="px-2 py-1">
                    {lane.code} {lane.label}
                  </td>
                  <td className="px-1">
                    <input
                      type="number"
                      min={0}
                      className="mrt-input w-16 text-center"
                      value={store.leadGeneral[lane.code] ?? lane.defLead}
                      onChange={(e) =>
                        update((n) => {
                          n.leadGeneral[lane.code] = Number(e.target.value) || 0;
                        })
                      }
                    />
                  </td>
                  {dams.map((dam) => (
                    <td key={dam.id} className="px-1">
                      <input
                        type="number"
                        min={0}
                        className={`mrt-input w-16 text-center ${
                          store.leadOverrides[lane.code]?.[dam.id] != null
                            ? "overridden"
                            : ""
                        }`}
                        value={store.leadOverrides[lane.code]?.[dam.id] ?? ""}
                        placeholder={String(store.leadGeneral[lane.code] ?? "")}
                        onChange={(e) =>
                          update((n) => {
                            if (!n.leadOverrides[lane.code]) n.leadOverrides[lane.code] = {};
                            if (e.target.value === "") {
                              delete n.leadOverrides[lane.code][dam.id];
                            } else {
                              n.leadOverrides[lane.code][dam.id] =
                                Number(e.target.value) || 0;
                            }
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
