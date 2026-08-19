"use client";

import { useState } from "react";
import type { Dam, FrequencyUnit, Lane, Person, ScheduleStore } from "../schema";
import { joinPersonName, samePersonName, splitPersonName } from "../schema";
import { DEFAULT_WEEKLY_CAPACITY_HOURS } from "../catalog/roster";
import { newAssignmentId, weekCountFromLeadMonths } from "../logic/assignment";
import { prepareInspectReportPlan } from "../logic/default-plan";
import { removeDam, removeLane, removePerson, removeRole } from "../logic/cascade";
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
      <table className="mrt-table">
        <thead>
          <tr>
            <th>Dam name</th>
            <th>Region</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {store.dams.map((dam, i) => (
            <tr key={dam.id}>
              <td>
                <input
                  className="mrt-input"
                  value={dam.name}
                  onChange={(e) =>
                    update((n) => {
                      n.dams[i].name = e.target.value;
                    })
                  }
                />
              </td>
              <td>
                <input
                  className="mrt-input"
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
              <td>
                <button
                  type="button"
                  className="mrt-remove"
                  title="Remove row"
                  onClick={() => {
                    if (!confirm(`Remove ${dam.name}?`)) return;
                    update((n) => removeDam(n, dam.id));
                  }}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="mrt-btn-secondary mt-3"
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
            if (!n.laneCycleAnchors) n.laneCycleAnchors = {};
            n.laneCycleAnchors[dam.id] = {};
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
      <table className="mrt-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Code</th>
            <th>Frequency</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {store.lanes.map((lane, i) => (
            <tr key={lane.code}>
              <td>
                <input
                  className="mrt-input"
                  value={lane.label}
                  onChange={(e) =>
                    update((n) => {
                      n.lanes[i].label = e.target.value;
                    })
                  }
                />
              </td>
              <td>
                <input
                  className="mrt-input"
                  style={{ width: 96, fontFamily: "ui-monospace, monospace" }}
                  value={lane.code}
                  onChange={(e) =>
                    update((n) => {
                      const prev = n.lanes[i].code;
                      const nextCode = e.target.value.toUpperCase();
                      n.lanes[i].code = nextCode;
                      if (prev !== nextCode) {
                        n.leadGeneral[nextCode] =
                          n.leadGeneral[prev] ?? n.lanes[i].defLead;
                        n.leadOverrides[nextCode] = n.leadOverrides[prev] || {};
                        delete n.leadGeneral[prev];
                        delete n.leadOverrides[prev];
                        for (const dam of n.dams) {
                          if (!n.laneApplicability[dam.id]) continue;
                          n.laneApplicability[dam.id][nextCode] =
                            n.laneApplicability[dam.id][prev] ?? true;
                          delete n.laneApplicability[dam.id][prev];
                        }
                        if (!n.laneCycleAnchors) n.laneCycleAnchors = {};
                        for (const dam of n.dams) {
                          if (!n.laneCycleAnchors[dam.id]) continue;
                          n.laneCycleAnchors[dam.id][nextCode] =
                            n.laneCycleAnchors[dam.id][prev];
                          delete n.laneCycleAnchors[dam.id][prev];
                        }
                      }
                    })
                  }
                />
              </td>
              <td>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={1}
                    className="mrt-input"
                    style={{ width: 56 }}
                    value={lane.frequencyCount}
                    onChange={(e) =>
                      update((n) => {
                        n.lanes[i].frequencyCount = Math.max(
                          1,
                          Number(e.target.value) || 1,
                        );
                      })
                    }
                  />
                  <select
                    className="mrt-select"
                    style={{ width: 92 }}
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
              <td>
                <button
                  type="button"
                  className="mrt-remove"
                  title="Remove row"
                  onClick={() => {
                    if (!confirm(`Remove obligation type ${lane.code}?`)) return;
                    update((n) => removeLane(n, lane.code));
                  }}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="mrt-btn-secondary mt-3"
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
            n.defaultPlansByLane[code] = prepareInspectReportPlan(
              weekCountFromLeadMonths(2),
            );
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
      <table className="mrt-table">
        <thead>
          <tr>
            <th>Role name</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {store.resourceRoles.map((role, i) => (
            <tr key={`${role}-${i}`}>
              <td>
                <input
                  className="mrt-input"
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
              <td>
                <button
                  type="button"
                  className="mrt-remove"
                  title="Remove row"
                  onClick={() => {
                    if (!confirm(`Remove role ${role}?`)) return;
                    update((n) => removeRole(n, n.resourceRoles[i]));
                  }}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="mrt-btn-secondary mt-3"
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
  const [draftFirst, setDraftFirst] = useState("");
  const [draftLast, setDraftLast] = useState("");
  const [draftHours, setDraftHours] = useState(DEFAULT_WEEKLY_CAPACITY_HOURS);

  function setParts(index: number, first: string, last: string) {
    const name = joinPersonName(first, last);
    if (!first.trim() || !last.trim()) {
      update((n) => {
        n.people[index].name = name;
      });
      return;
    }
    const clash = store.people.some((p, j) => j !== index && samePersonName(p.name, name));
    if (clash) {
      window.alert("That name already exists.");
      return;
    }
    update((n) => {
      n.people[index].name = name;
    });
  }

  function addPerson() {
    const first = draftFirst.trim();
    const last = draftLast.trim();
    if (!first || !last) {
      window.alert("First and last name are required.");
      return;
    }
    const name = joinPersonName(first, last);
    if (store.people.some((p) => samePersonName(p.name, name))) {
      window.alert("That name already exists.");
      return;
    }
    update((n) => {
      const person: Person = {
        id: newAssignmentId("res-"),
        name,
        role: n.resourceRoles[0] || "Lead",
        weeklyCapacityHours: draftHours || DEFAULT_WEEKLY_CAPACITY_HOURS,
      };
      n.people.push(person);
      if (!n.roleEligibility[person.role]) n.roleEligibility[person.role] = {};
      n.roleEligibility[person.role][person.id] = true;
    });
    setDraftFirst("");
    setDraftLast("");
    setDraftHours(DEFAULT_WEEKLY_CAPACITY_HOURS);
  }

  return (
    <div>
      <label className="mb-3 block text-sm">
        Overrun %
        <input
          type="number"
          min={100}
          className="mrt-input mt-1"
          style={{ width: 80 }}
          value={store.overrunPercent}
          onChange={(e) =>
            update((n) => {
              n.overrunPercent = Number(e.target.value) || 125;
            })
          }
        />
      </label>
      <table className="mrt-table">
        <thead>
          <tr>
            <th>First name</th>
            <th>Last name</th>
            <th>Available hours / week</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {store.people.map((p, i) => {
            const parts = splitPersonName(p.name);
            return (
              <tr key={p.id}>
                <td>
                  <input
                    className="mrt-input"
                    value={parts.first}
                    onChange={(e) => setParts(i, e.target.value, parts.last)}
                  />
                </td>
                <td>
                  <input
                    className="mrt-input"
                    value={parts.last}
                    onChange={(e) => setParts(i, parts.first, e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    className="mrt-input"
                    style={{ width: 80 }}
                    value={p.weeklyCapacityHours}
                    onChange={(e) =>
                      update((n) => {
                        n.people[i].weeklyCapacityHours = Number(e.target.value) || 0;
                      })
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="mrt-remove"
                    title="Remove row"
                    onClick={() => {
                      if (!confirm(`Remove ${p.name}?`)) return;
                      update((n) => removePerson(n, p.id));
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
          <tr>
            <td>
              <input
                className="mrt-input"
                placeholder="First"
                value={draftFirst}
                onChange={(e) => setDraftFirst(e.target.value)}
              />
            </td>
            <td>
              <input
                className="mrt-input"
                placeholder="Last"
                value={draftLast}
                onChange={(e) => setDraftLast(e.target.value)}
              />
            </td>
            <td>
              <input
                type="number"
                min={0}
                className="mrt-input"
                style={{ width: 80 }}
                value={draftHours}
                onChange={(e) => setDraftHours(Number(e.target.value) || 0)}
              />
            </td>
            <td />
          </tr>
        </tbody>
      </table>
      <button type="button" className="mrt-btn-secondary mt-3" onClick={addPerson}>
        + Person
      </button>
    </div>
  );
}
