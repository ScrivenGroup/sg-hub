"use client";

import { useState } from "react";
import type { Dam, FrequencyUnit, Lane, Person, ScheduleStore } from "../schema";
import { DEFAULT_WEEKLY_CAPACITY_HOURS } from "../catalog/roster";
import { newAssignmentId } from "../logic/assignment";
import { SubTabs } from "./SubTabs";

const SUBS = [
  "Assets",
  "Obligation Types",
  "Resource Roles",
  "Resource Names",
] as const;

const UNITS: FrequencyUnit[] = ["year", "month", "week"];

export function InputsTab({
  store,
  onChange,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
}) {
  const [sub, setSub] = useState<(typeof SUBS)[number]>("Assets");

  function update(mut: (next: ScheduleStore) => void) {
    const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    mut(next);
    onChange(next);
  }

  return (
    <div>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === "Assets" ? <AssetsTable store={store} update={update} /> : null}
      {sub === "Obligation Types" ? (
        <TypesTable store={store} update={update} />
      ) : null}
      {sub === "Resource Roles" ? (
        <RolesTable store={store} update={update} />
      ) : null}
      {sub === "Resource Names" ? (
        <NamesTable store={store} update={update} />
      ) : null}
    </div>
  );
}

function AssetsTable({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  return (
    <div>
      <table className="w-max table-auto text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)]">
            <th className="px-2 py-1">Dam name</th>
            <th className="px-2 py-1">Region</th>
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
                  value={dam.region}
                  onChange={(e) =>
                    update((n) => {
                      n.dams[i].region = e.target.value;
                      n.damMeta[dam.id] = {
                        ...(n.damMeta[dam.id] || {}),
                        region: e.target.value,
                      };
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
              name: "New asset",
              region: "",
              custom: true,
            };
            n.dams.push(dam);
            n.damMeta[dam.id] = { region: "" };
            n.laneApplicability[dam.id] = {};
            for (const lane of n.lanes) {
              n.laneApplicability[dam.id][lane.code] = true;
            }
          })
        }
      >
        + Asset
      </button>
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
      <table className="w-max table-auto text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)]">
            <th className="px-2 py-1">Title</th>
            <th className="px-2 py-1">Code</th>
            <th className="px-2 py-1">Frequency</th>
          </tr>
        </thead>
        <tbody>
          {store.lanes.map((lane, i) => (
            <tr key={lane.code} className="border-t border-[var(--border)]">
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
              <td className="px-2 py-1">
                <input
                  className="sg-input min-h-9 w-24 py-1 font-mono"
                  value={lane.code}
                  onChange={(e) =>
                    update((n) => {
                      const prev = n.lanes[i].code;
                      const nextCode = e.target.value.toUpperCase();
                      n.lanes[i].code = nextCode;
                      if (prev !== nextCode) {
                        n.leadGeneral[nextCode] = n.leadGeneral[prev] ?? n.lanes[i].defLead;
                        n.leadOverrides[nextCode] = n.leadOverrides[prev] || {};
                        delete n.leadGeneral[prev];
                        delete n.leadOverrides[prev];
                        for (const dam of n.dams) {
                          if (!n.laneApplicability[dam.id]) continue;
                          n.laneApplicability[dam.id][nextCode] =
                            n.laneApplicability[dam.id][prev] ?? true;
                          delete n.laneApplicability[dam.id][prev];
                        }
                      }
                    })
                  }
                />
              </td>
              <td className="px-2 py-1">
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={1}
                    className="sg-input min-h-9 w-16 py-1"
                    value={lane.frequencyCount}
                    onChange={(e) =>
                      update((n) => {
                        n.lanes[i].frequencyCount = Math.max(1, Number(e.target.value) || 1);
                      })
                    }
                  />
                  <select
                    className="sg-input min-h-9 w-28 py-1"
                    value={lane.frequencyUnit}
                    onChange={(e) =>
                      update((n) => {
                        n.lanes[i].frequencyUnit = e.target.value as FrequencyUnit;
                      })
                    }
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
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
              frequencyCount: 1,
              frequencyUnit: "year",
              dueMonth: 6,
              defLead: 2,
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

function RolesTable({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  return (
    <div>
      <table className="w-max table-auto text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)]">
            <th className="px-2 py-1">Role name</th>
          </tr>
        </thead>
        <tbody>
          {store.resourceRoles.map((role, i) => (
            <tr key={`${role}-${i}`} className="border-t border-[var(--border)]">
              <td className="px-2 py-1">
                <input
                  className="sg-input min-h-9 py-1"
                  value={role}
                  onChange={(e) =>
                    update((n) => {
                      const prev = n.resourceRoles[i];
                      n.resourceRoles[i] = e.target.value;
                      if (n.roleEligibility[prev] && e.target.value !== prev) {
                        n.roleEligibility[e.target.value] = n.roleEligibility[prev];
                        delete n.roleEligibility[prev];
                      }
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
            n.resourceRoles.push("New role");
            n.roleEligibility["New role"] = {};
          })
        }
      >
        + Role
      </button>
    </div>
  );
}

function NamesTable({
  store,
  update,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
}) {
  return (
    <div>
      <label className="mb-3 block text-sm">
        Overrun %
        <input
          type="number"
          min={100}
          className="sg-input mt-1 max-w-24"
          value={store.overrunPercent}
          onChange={(e) =>
            update((n) => {
              n.overrunPercent = Number(e.target.value) || 125;
            })
          }
        />
      </label>
      <table className="w-max table-auto text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)]">
            <th className="px-2 py-1">Full name</th>
            <th className="px-2 py-1">Available hours / week</th>
          </tr>
        </thead>
        <tbody>
          {store.people.map((p, i) => (
            <tr key={p.id} className="border-t border-[var(--border)]">
              <td className="px-2 py-1">
                <input
                  className="sg-input min-h-9 py-1"
                  value={p.name}
                  onChange={(e) =>
                    update((n) => {
                      n.people[i].name = e.target.value;
                    })
                  }
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  min={0}
                  className="sg-input min-h-9 w-24 py-1"
                  value={p.weeklyCapacityHours}
                  onChange={(e) =>
                    update((n) => {
                      n.people[i].weeklyCapacityHours = Number(e.target.value) || 0;
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
            const person: Person = {
              id: newAssignmentId("res-"),
              name: "New person",
              role: n.resourceRoles[0] || "Lead",
              weeklyCapacityHours: DEFAULT_WEEKLY_CAPACITY_HOURS,
            };
            n.people.push(person);
            if (!n.roleEligibility[person.role]) n.roleEligibility[person.role] = {};
            n.roleEligibility[person.role][person.id] = true;
          })
        }
      >
        + Person
      </button>
    </div>
  );
}
