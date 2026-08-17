"use client";

import { useState } from "react";
import type { ScheduleStore } from "../schema";
import { getEffectiveDamOwnership } from "../logic/assignment";
import { SubTabs } from "./SubTabs";

const SUBS = [
  "Asset × Obligation",
  "Resource × Role",
  "Asset × Resource Role",
] as const;

export function DefinitionsTab({
  store,
  onChange,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
}) {
  const [sub, setSub] = useState<(typeof SUBS)[number]>("Asset × Obligation");

  function update(mut: (next: ScheduleStore) => void) {
    const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    mut(next);
    onChange(next);
  }

  return (
    <div>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === "Asset × Obligation" ? (
        <ApplyMatrix store={store} update={update} />
      ) : null}
      {sub === "Resource × Role" ? (
        <EligibilityMatrix store={store} update={update} />
      ) : null}
      {sub === "Asset × Resource Role" ? (
        <OwnershipMatrix store={store} update={update} />
      ) : null}
    </div>
  );
}

function FlipToggle({
  flipped,
  onFlip,
}: {
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <button type="button" className="sg-btn-secondary mb-3 text-sm" onClick={onFlip}>
      Flip axis {flipped ? "(obligations × assets)" : ""}
    </button>
  );
}

function ApplyMatrix({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const rowItems = flipped ? store.lanes : store.dams;
  const colItems = flipped ? store.dams : store.lanes;

  return (
    <div>
      <FlipToggle flipped={flipped} onFlip={() => setFlipped((v) => !v)} />
      <div className="overflow-x-auto">
        <table className="w-max table-auto border-collapse text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">
                {flipped ? "Obligation" : "Asset"}
              </th>
              {colItems.map((c) => (
                <th key={"code" in c ? c.code : c.id} className="px-2 py-1">
                  {"code" in c ? c.code : c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowItems.map((row) => {
              const rowDam = "region" in row;
              return (
                <tr
                  key={rowDam ? row.id : row.code}
                  className="border-t border-[var(--border)]"
                >
                  <td className="px-2 py-1">
                    {rowDam ? row.name : `${row.code} ${row.label}`}
                  </td>
                  {colItems.map((col) => {
                    const dam = rowDam ? row : (col as typeof store.dams[0]);
                    const lane = rowDam ? (col as typeof store.lanes[0]) : row;
                    const on = store.laneApplicability[dam.id]?.[lane.code] ?? true;
                    return (
                      <td key={dam.id + lane.code} className="px-2 text-center">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) =>
                            update((n) => {
                              if (!n.laneApplicability[dam.id]) {
                                n.laneApplicability[dam.id] = {};
                              }
                              n.laneApplicability[dam.id][lane.code] = e.target.checked;
                            })
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EligibilityMatrix({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const roles = store.resourceRoles;
  const people = store.people;

  return (
    <div>
      <FlipToggle flipped={flipped} onFlip={() => setFlipped((v) => !v)} />
      <p className="mb-2 text-xs text-[var(--muted)]">
        Tick = this person appears in dropdowns for that role.
      </p>
      <div className="overflow-x-auto">
        <table className="w-max table-auto border-collapse text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">
                {flipped ? "Role" : "Person"}
              </th>
              {(flipped ? people : roles).map((c) => (
                <th key={typeof c === "string" ? c : c.id} className="px-2 py-1">
                  {typeof c === "string" ? c : c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(flipped ? roles : people).map((row) => {
              const roleRow = typeof row === "string";
              return (
                <tr
                  key={roleRow ? row : row.id}
                  className="border-t border-[var(--border)]"
                >
                  <td className="px-2 py-1">{roleRow ? row : row.name}</td>
                  {(flipped ? people : roles).map((col) => {
                    const role = roleRow ? row : (col as string);
                    const person = roleRow ? (col as (typeof people)[0]) : row;
                    const on = !!store.roleEligibility[role]?.[person.id];
                    return (
                      <td key={`${role}-${person.id}`} className="px-2 text-center">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) =>
                            update((n) => {
                              if (!n.roleEligibility[role]) n.roleEligibility[role] = {};
                              n.roleEligibility[role][person.id] = e.target.checked;
                            })
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function eligiblePeople(store: ScheduleStore, role: string) {
  return store.people.filter((p) => store.roleEligibility[role]?.[p.id]);
}

function OwnershipMatrix({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  const cols = store.damOwnershipColumns.length
    ? store.damOwnershipColumns
    : store.resourceRoles.slice(0, 3);
  const regions = [...new Set(store.dams.map((d) => d.region || "Unassigned"))];

  function setOwnership(contextKey: string, role: string, value: string) {
    update((n) => {
      if (!n.damOwnership[role]) n.damOwnership[role] = {};
      if (!value) delete n.damOwnership[role][contextKey];
      else n.damOwnership[role][contextKey] = value;
    });
  }

  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-xs text-[var(--muted)]">
        All assets, then region, then asset. More specific cells overwrite.
        Dropdowns follow Resource × Role.
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
              + {r}
            </button>
          ))}
      </div>
      <table className="w-max table-auto text-xs">
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
          <tr className="border-t border-[var(--border)] bg-[var(--surface-muted)]">
            <td className="px-2 py-1 font-medium">All assets</td>
            {cols.map((role) => (
              <td key={role} className="px-1">
                <PersonSelect
                  store={store}
                  role={role}
                  value={store.damOwnership[role]?.ALL || ""}
                  onChange={(v) => setOwnership("ALL", role, v)}
                />
              </td>
            ))}
          </tr>
          {regions.map((region) => (
            <RegionBlock
              key={region}
              region={region}
              store={store}
              cols={cols}
              setOwnership={setOwnership}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegionBlock({
  region,
  store,
  cols,
  setOwnership,
}: {
  region: string;
  store: ScheduleStore;
  cols: string[];
  setOwnership: (contextKey: string, role: string, value: string) => void;
}) {
  const dams = store.dams.filter((d) => (d.region || "Unassigned") === region);
  return (
    <>
      <tr className="border-t border-[var(--border)]">
        <td className="px-2 py-1 font-medium">{region}</td>
        {cols.map((role) => (
          <td key={role} className="px-1">
            <PersonSelect
              store={store}
              role={role}
              value={store.damOwnership[role]?.[`region:${region}`] || ""}
              placeholder="inherit"
              onChange={(v) => setOwnership(`region:${region}`, role, v)}
            />
          </td>
        ))}
      </tr>
      {dams.map((dam) => (
        <tr key={dam.id} className="border-t border-[var(--border)]">
          <td className="px-2 py-1 pl-6">{dam.name}</td>
          {cols.map((role) => {
            const explicit = store.damOwnership[role]?.[`dam:${dam.id}`] || "";
            const effective = getEffectiveDamOwnership(store, dam.id, role);
            return (
              <td key={role} className="px-1">
                <PersonSelect
                  store={store}
                  role={role}
                  value={explicit}
                  displayValue={effective}
                  placeholder="inherit"
                  onChange={(v) => setOwnership(`dam:${dam.id}`, role, v)}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function PersonSelect({
  store,
  role,
  value,
  displayValue,
  placeholder,
  onChange,
}: {
  store: ScheduleStore;
  role: string;
  value: string;
  displayValue?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const people = eligiblePeople(store, role);
  const shown = value || "";
  return (
    <select
      className="sg-input min-h-8 py-0 text-xs"
      value={shown}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder || "—"}</option>
      {!shown && displayValue ? (
        <option value="" disabled>
          {displayValue} (inherited)
        </option>
      ) : null}
      {people.map((p) => (
        <option key={p.id} value={p.name}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
