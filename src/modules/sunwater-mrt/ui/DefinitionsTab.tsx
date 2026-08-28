"use client";

import { useEffect, useState } from "react";
import type { ScheduleStore } from "../schema";
import { laneApplies } from "../logic/applicability";
import { removeOwnershipColumn } from "../logic/cascade";
import { MONTH_NAMES } from "../logic/dates";
import { pairHasActualised } from "../logic/scheduling";
import { ensureEffortDemo, outOfRoleKeys } from "../logic/effort-gantt";
import { CrossLinks, SubTabs } from "./SubTabs";
import type { InputsSub } from "./InputsTab";

const SUBS = [
  "Asset × Obligation",
  "Resource × Role",
  "Asset × Resource Role",
] as const;

export type DefinitionsSub = (typeof SUBS)[number];

export function DefinitionsTab({
  store,
  onChange,
  readOnly = false,
  focusSub,
  onGoToInputs,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
  readOnly?: boolean;
  focusSub?: DefinitionsSub | null;
  onGoToInputs?: (sub: InputsSub) => void;
}) {
  const [sub, setSub] = useState<(typeof SUBS)[number]>(
    focusSub && SUBS.includes(focusSub) ? focusSub : "Asset × Obligation",
  );

  useEffect(() => {
    if (focusSub && SUBS.includes(focusSub)) setSub(focusSub);
  }, [focusSub]);

  function update(mut: (next: ScheduleStore) => void) {
    if (readOnly) return;
    const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    mut(next);
    onChange(next);
  }

  return (
    <div>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === "Asset × Obligation" ? (
        <>
          <CrossLinks
            links={[
              { label: "Go to Assets", onClick: () => onGoToInputs?.("Assets") },
              {
                label: "Go to Obligation Types",
                onClick: () => onGoToInputs?.("Obligation Types"),
              },
            ]}
          />
          <div className={readOnly ? "mrt-ro" : undefined}>
            <ApplyMatrix store={store} update={update} />
          </div>
        </>
      ) : null}
      {sub === "Resource × Role" ? (
        <>
          <CrossLinks
            links={[
              {
                label: "Go to Resource Roles",
                onClick: () => onGoToInputs?.("Resource Roles"),
              },
              {
                label: "Go to Resource Names",
                onClick: () => onGoToInputs?.("Resource Names"),
              },
            ]}
          />
          <div className={readOnly ? "mrt-ro" : undefined}>
            <EligibilityMatrix store={store} update={update} />
          </div>
        </>
      ) : null}
      {sub === "Asset × Resource Role" ? (
        <>
          <CrossLinks
            links={[
              { label: "Go to Assets", onClick: () => onGoToInputs?.("Assets") },
              {
                label: "Go to Resource Names",
                onClick: () => onGoToInputs?.("Resource Names"),
              },
            ]}
          />
          <div className={readOnly ? "mrt-ro" : undefined}>
            <OwnershipMatrix store={store} update={update} />
          </div>
        </>
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
    <button type="button" className="mrt-btn-secondary mb-3" onClick={onFlip}>
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
      <p className="mb-2 text-xs text-[var(--muted)]">
        Unchecking drops calculated-only rows. Actualised occurrences stay
        (grey on Gantt / Obligations) until you delete them explicitly.
      </p>
      <div className="overflow-x-auto">
        <table className="mrt-table">
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
                    const kept = !on && pairHasActualised(store, dam.id, lane.code);
                    return (
                      <td
                        key={dam.id + lane.code}
                        className={`px-2 text-center ${kept ? "mrt-row-kept" : ""}`}
                        title={kept ? "Input off — not deleted" : undefined}
                      >
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
      <AnchorTable store={store} update={update} />
    </div>
  );
}

function AnchorTable({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  const pairs = store.dams.flatMap((dam) =>
    store.lanes
      .filter((lane) => {
        const applies = laneApplies(store.laneApplicability, dam, lane);
        const kept =
          pairHasActualised(store, dam.id, lane.code) ||
          !!store.laneCycleAnchors?.[dam.id]?.[lane.code];
        return applies || kept;
      })
      .map((lane) => ({ dam, lane })),
  );
  const years: number[] = [];
  const now = new Date().getFullYear();
  for (let y = now - 10; y <= now + 40; y++) years.push(y);

  function setAnchor(damId: string, code: string, y: number | null, m: number | null) {
    update((n) => {
      if (!n.laneCycleAnchors) n.laneCycleAnchors = {};
      if (!n.laneCycleAnchors[damId]) n.laneCycleAnchors[damId] = {};
      if (!y || !m) {
        delete n.laneCycleAnchors[damId][code];
        return;
      }
      n.laneCycleAnchors[damId][code] = { y, m };
    });
  }

  return (
    <div className="mt-6">
      <h3 className="mb-1 text-sm font-semibold">Cycle origins</h3>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Next due is the cycle origin for that dam × obligation (for example
        staggering comprehensive inspections so they do not all land in the
        same year). Leave blank to count forward from today.
      </p>
      <div className="overflow-x-auto">
        <table className="mrt-table mrt-table-gaps">
          <thead>
            <tr>
              <th>Dam</th>
              <th>Obligation</th>
              <th>Next due</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map(({ dam, lane }) => {
              const anchor = store.laneCycleAnchors?.[dam.id]?.[lane.code];
              const applies = laneApplies(store.laneApplicability, dam, lane);
              return (
                <tr
                  key={`${dam.id}-${lane.code}`}
                  className={applies ? undefined : "mrt-row-kept"}
                  title={applies ? undefined : "Input off — not deleted"}
                >
                  <td>{dam.name}</td>
                  <td>
                    {lane.code} {lane.label}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <select
                        className="mrt-select"
                        style={{ width: 88 }}
                        value={anchor?.y ?? ""}
                        onChange={(e) =>
                          setAnchor(
                            dam.id,
                            lane.code,
                            e.target.value ? Number(e.target.value) : null,
                            anchor?.m ?? 6,
                          )
                        }
                      >
                        <option value="">Default</option>
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                      <select
                        className="mrt-select"
                        style={{ width: 72 }}
                        value={anchor?.m ?? ""}
                        onChange={(e) =>
                          setAnchor(
                            dam.id,
                            lane.code,
                            anchor?.y ?? now,
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                      >
                        <option value="">—</option>
                        {MONTH_NAMES.map((name, i) => (
                          <option key={name} value={i + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
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
  const outOfRole = outOfRoleKeys(ensureEffortDemo(store.effortDemo), store.roleEligibility);

  return (
    <div>
      <FlipToggle flipped={flipped} onFlip={() => setFlipped((v) => !v)} />
      <p className="mb-2 text-xs text-[var(--muted)]">
        Tick = this person appears in dropdowns for that role. Unchecking does
        not remove people already assigned on assets or actualised plans.
        <span className="ml-1 text-[var(--ink)]">*</span> = assigned on a
        milestone Gantt outside this tick.
      </p>
      <div className="overflow-x-auto">
        <table className="mrt-table">
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
                    const star = outOfRole.has(`${role}::${person.id}`);
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
                        {star ? (
                          <span className="ml-0.5 text-[11px] text-[var(--ink)]" title="Assigned outside this role tick">*</span>
                        ) : null}
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

function peopleForRoleSelect(
  store: ScheduleStore,
  role: string,
  currentValue: string,
) {
  const eligible = store.people.filter((p) => store.roleEligibility[role]?.[p.id]);
  const extra = store.people.find(
    (p) => p.name === currentValue || p.id === currentValue,
  );
  if (extra && !eligible.some((p) => p.id === extra.id)) {
    return { people: [extra, ...eligible], keptId: extra.id };
  }
  return { people: eligible, keptId: null as string | null };
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
        Clearing a cell is explicit; making a person ineligible later does not
        wipe a filled assignment.
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
      <table className="mrt-table mrt-own-table">
        <thead>
          <tr>
            <th>Hierarchy</th>
            {cols.map((c) => (
              <th key={c}>
                {c}{" "}
                <button
                  type="button"
                  className="mrt-remove"
                  title={`Remove ${c} column`}
                  onClick={() => {
                    if (!confirm(`Remove column ${c}?`)) return;
                    update((n) => removeOwnershipColumn(n, c));
                  }}
                >
                  ×
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="mrt-own-l0">
            <td className="mrt-own-label">All dams</td>
            {cols.map((role) => (
              <td key={role}>
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
      <tr className="mrt-own-l1">
        <td className="mrt-own-label">{region}</td>
        {cols.map((role) => (
          <td key={role}>
            <PersonSelect
              store={store}
              role={role}
              value={store.damOwnership[role]?.[`region:${region}`] || ""}
              inherited={store.damOwnership[role]?.ALL || ""}
              onChange={(v) => setOwnership(`region:${region}`, role, v)}
            />
          </td>
        ))}
      </tr>
      {dams.map((dam) => (
        <tr key={dam.id} className="mrt-own-l2">
          <td className="mrt-own-label mrt-own-asset">{dam.name}</td>
          {cols.map((role) => {
            const explicit = store.damOwnership[role]?.[`dam:${dam.id}`] || "";
            const regionVal = store.damOwnership[role]?.[`region:${region}`] || "";
            const allVal = store.damOwnership[role]?.ALL || "";
            return (
              <td key={role}>
                <PersonSelect
                  store={store}
                  role={role}
                  value={explicit}
                  inherited={regionVal || allVal}
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
  inherited,
  onChange,
}: {
  store: ScheduleStore;
  role: string;
  value: string;
  inherited?: string;
  onChange: (value: string) => void;
}) {
  const shown = value || "";
  const { people, keptId } = peopleForRoleSelect(store, role, shown);
  const inheritedName =
    inherited && store.people.find((p) => p.name === inherited || p.id === inherited)?.name
      || inherited
      || "";
  return (
    <div className="mrt-own-cell">
      <select
        className={`mrt-select${shown ? " is-explicit" : ""}`}
        value={shown}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">-- inherit --</option>
        {people.map((p) => (
          <option key={p.id} value={p.name}>
            {p.id === keptId ? `${p.name} (kept)` : p.name}
          </option>
        ))}
      </select>
      {shown ? null : inheritedName ? (
        <span className="mrt-own-inherit">→ {inheritedName}</span>
      ) : (
        <span className="mrt-own-unassigned">unassigned</span>
      )}
    </div>
  );
}
