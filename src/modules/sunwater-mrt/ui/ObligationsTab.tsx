"use client";

import { useState } from "react";
import type { Dam, Lane, ScheduleStore } from "../schema";
import { defaultLaneApplies } from "../logic/applicability";
import { newAssignmentId } from "../logic/assignment";

const SUBS = ["Apply", "Types", "Dams", "Lead times", "Ownership"] as const;

export function ObligationsTab({
  store,
  onChange,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
}) {
  const [sub, setSub] = useState<(typeof SUBS)[number]>("Apply");

  function update(mut: (next: ScheduleStore) => void) {
    const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    mut(next);
    onChange(next);
  }

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Seeded 24 dams × 11 regulator types. Tick which obligations apply, set
        lead times, and add or rename catalog rows.
      </p>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border)]">
        {SUBS.map((id) => (
          <button
            key={id}
            type="button"
            className={`min-h-10 px-3 text-sm ${
              sub === id
                ? "border-b-2 border-[var(--ink)] font-medium"
                : "text-[var(--muted)]"
            }`}
            onClick={() => setSub(id)}
          >
            {id}
          </button>
        ))}
      </div>
      {sub === "Apply" ? <ApplyGrid store={store} update={update} /> : null}
      {sub === "Types" ? <TypesTable store={store} update={update} /> : null}
      {sub === "Dams" ? <DamsTable store={store} update={update} /> : null}
      {sub === "Lead times" ? <LeadTable store={store} update={update} /> : null}
      {sub === "Ownership" ? <OwnershipTable store={store} update={update} /> : null}
    </div>
  );
}

function ApplyGrid({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-[var(--surface)] px-2 py-2 text-left">Dam</th>
            {store.lanes.map((l) => (
              <th key={l.code} className="px-1 py-2" title={l.label}>
                {l.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {store.dams.map((dam) => (
            <tr key={dam.id} className="border-t border-[var(--border)]">
              <td className="sticky left-0 bg-[var(--surface)] px-2 py-1">{dam.name}</td>
              {store.lanes.map((lane) => {
                const on = store.laneApplicability[dam.id]?.[lane.code] ?? defaultLaneApplies(dam, lane);
                return (
                  <td key={lane.code} className="px-1 text-center">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        update((n) => {
                          if (!n.laneApplicability[dam.id]) n.laneApplicability[dam.id] = {};
                          n.laneApplicability[dam.id][lane.code] = e.target.checked;
                        })
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TypesTable({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  return (
    <div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)]">
            <th className="px-2 py-1">Code</th>
            <th className="px-2 py-1">Label</th>
            <th className="px-2 py-1">Kind</th>
            <th className="px-2 py-1">Default lead</th>
          </tr>
        </thead>
        <tbody>
          {store.lanes.map((lane, i) => (
            <tr key={lane.code} className="border-t border-[var(--border)]">
              <td className="px-2 py-1 font-mono">{lane.code}</td>
              <td className="px-2 py-1">
                <input
                  className="sg-input min-h-9 py-1"
                  value={lane.label}
                  onChange={(e) =>
                    update((n) => {
                      n.lanes[i].label = e.target.value;
                    })
                  }
                />
              </td>
              <td className="px-2 py-1 text-xs">{lane.kind}</td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  min={0}
                  className="sg-input min-h-9 w-20 py-1"
                  value={lane.defLead}
                  onChange={(e) =>
                    update((n) => {
                      n.lanes[i].defLead = Number(e.target.value) || 0;
                    })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="sg-btn-secondary mt-3 text-sm"
        onClick={() =>
          update((n) => {
            const code = `X${n.lanes.length + 1}`;
            const lane: Lane = {
              code,
              label: "New obligation type",
              color: "#6b6b69",
              defLead: 2,
              assumed: true,
              kind: "annual-fixed",
              month: 6,
              source: "User-added",
              custom: true,
            };
            n.lanes.push(lane);
            n.leadGeneral[code] = 2;
            n.leadOverrides[code] = {};
            for (const dam of n.dams) {
              if (!n.laneApplicability[dam.id]) n.laneApplicability[dam.id] = {};
              n.laneApplicability[dam.id][code] = true;
            }
          })
        }
      >
        + Obligation type
      </button>
    </div>
  );
}

function DamsTable({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  return (
    <div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)]">
            <th className="px-2 py-1">Name</th>
            <th className="px-2 py-1">Region</th>
            <th className="px-2 py-1">AI</th>
            <th className="px-2 py-1">CI years</th>
            <th className="px-2 py-1">SR years</th>
          </tr>
        </thead>
        <tbody>
          {store.dams.map((dam, i) => (
            <tr key={dam.id} className="border-t border-[var(--border)]">
              <td className="px-2 py-1">
                <input
                  className="sg-input min-h-9 py-1"
                  value={dam.name}
                  onChange={(e) =>
                    update((n) => {
                      n.dams[i].name = e.target.value;
                    })
                  }
                />
              </td>
              <td className="px-2 py-1">
                <input
                  className="sg-input min-h-9 py-1"
                  value={store.damMeta[dam.id]?.region || ""}
                  onChange={(e) =>
                    update((n) => {
                      n.damMeta[dam.id] = {
                        ...(n.damMeta[dam.id] || {}),
                        region: e.target.value,
                      };
                    })
                  }
                />
              </td>
              <td className="px-2 py-1 text-center">
                <input
                  type="checkbox"
                  checked={dam.ai}
                  onChange={(e) =>
                    update((n) => {
                      n.dams[i].ai = e.target.checked;
                    })
                  }
                />
              </td>
              <td className="px-2 py-1">
                <input
                  className="sg-input min-h-9 py-1 font-mono text-xs"
                  value={dam.ciYears.join(", ")}
                  onChange={(e) =>
                    update((n) => {
                      n.dams[i].ciYears = parseYears(e.target.value);
                    })
                  }
                />
              </td>
              <td className="px-2 py-1">
                <input
                  className="sg-input min-h-9 py-1 font-mono text-xs"
                  value={dam.srYears.join(", ")}
                  onChange={(e) =>
                    update((n) => {
                      n.dams[i].srYears = parseYears(e.target.value);
                    })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="sg-btn-secondary mt-3 text-sm"
        onClick={() =>
          update((n) => {
            const dam: Dam = {
              id: newAssignmentId("dam-"),
              name: "New dam",
              ciYears: [],
              srYears: [],
              ai: true,
              custom: true,
            };
            n.dams.push(dam);
            n.laneApplicability[dam.id] = {};
            for (const lane of n.lanes) {
              n.laneApplicability[dam.id][lane.code] = defaultLaneApplies(dam, lane);
            }
          })
        }
      >
        + Dam
      </button>
    </div>
  );
}

function LeadTable({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  const leadLanes = store.lanes.filter((l) => l.code !== "OTH");
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-xs text-[var(--muted)]">
        General lead-in months, with optional per-dam overrides (blank = general).
      </p>
      <div className="mb-4 flex flex-wrap gap-3">
        {leadLanes.map((lane) => (
          <label key={lane.code} className="text-sm">
            {lane.code}
            <input
              type="number"
              min={0}
              className="sg-input mt-1 min-h-9 w-20 py-1"
              value={store.leadGeneral[lane.code] ?? lane.defLead}
              onChange={(e) =>
                update((n) => {
                  n.leadGeneral[lane.code] = Number(e.target.value) || 0;
                })
              }
            />
          </label>
        ))}
      </div>
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left">Dam</th>
            {leadLanes.map((l) => (
              <th key={l.code}>{l.code}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {store.dams.map((dam) => (
            <tr key={dam.id} className="border-t border-[var(--border)]">
              <td className="px-2 py-1">{dam.name}</td>
              {leadLanes.map((lane) => (
                <td key={lane.code} className="px-1">
                  <input
                    type="number"
                    min={0}
                    className="h-8 w-14 rounded border border-[var(--border)] text-center"
                    value={store.leadOverrides[lane.code]?.[dam.id] ?? ""}
                    placeholder={String(store.leadGeneral[lane.code] ?? "")}
                    onChange={(e) =>
                      update((n) => {
                        if (!n.leadOverrides[lane.code]) n.leadOverrides[lane.code] = {};
                        if (e.target.value === "") {
                          delete n.leadOverrides[lane.code][dam.id];
                        } else {
                          n.leadOverrides[lane.code][dam.id] = Number(e.target.value) || 0;
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
    </div>
  );
}

function OwnershipTable({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  const cols = store.damOwnershipColumns;
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-xs text-[var(--muted)]">
        Most specific wins: dam → region → all dams. Values are people names.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {store.resourceRoles
          .filter((r) => !cols.includes(r))
          .map((r) => (
            <button
              key={r}
              type="button"
              className="sg-btn-ghost text-xs"
              onClick={() =>
                update((n) => {
                  n.damOwnershipColumns.push(r);
                })
              }
            >
              + {r} column
            </button>
          ))}
      </div>
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left">Context</th>
            {cols.map((c) => (
              <th key={c} className="px-2 py-1">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <OwnershipRow
            label="All dams"
            contextKey="ALL"
            store={store}
            cols={cols}
            update={update}
          />
          {store.dams.map((dam) => (
            <OwnershipRow
              key={dam.id}
              label={dam.name}
              contextKey={`dam:${dam.id}`}
              store={store}
              cols={cols}
              update={update}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OwnershipRow({
  label,
  contextKey,
  store,
  cols,
  update,
}: {
  label: string;
  contextKey: string;
  store: ScheduleStore;
  cols: string[];
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  return (
    <tr className="border-t border-[var(--border)]">
      <td className="px-2 py-1">{label}</td>
      {cols.map((role) => (
        <td key={role} className="px-1">
          <select
            className="sg-input min-h-8 py-0 text-xs"
            value={store.damOwnership[role]?.[contextKey] || ""}
            onChange={(e) =>
              update((n) => {
                if (!n.damOwnership[role]) n.damOwnership[role] = {};
                if (!e.target.value) delete n.damOwnership[role][contextKey];
                else n.damOwnership[role][contextKey] = e.target.value;
              })
            }
          >
            <option value="">—</option>
            {store.people.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </td>
      ))}
    </tr>
  );
}

function parseYears(raw: string) {
  return raw
    .split(/[,\s]+/)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 1900);
}
