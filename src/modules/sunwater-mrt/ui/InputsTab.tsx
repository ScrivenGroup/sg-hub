"use client";

import { useEffect, useState } from "react";
import type { Dam, FrequencyUnit, Lane, Person, ScheduleStore } from "../schema";
import { joinPersonName, samePersonName, splitPersonName } from "../schema";
import { DEFAULT_WEEKLY_CAPACITY_HOURS, defaultExternalRate, defaultInternalRateForRole, externalRateDotKind, externalRateIsCustom } from "../catalog/roster";
import { newAssignmentId, weekCountFromLeadMonths } from "../logic/assignment";
import { prepareInspectReportPlan } from "../logic/default-plan";
import { removeDam, removeLane, removePerson, removeRole } from "../logic/cascade";
import { CrossLinks, SubTabs } from "./SubTabs";
import { parseDecimal } from "../logic/numbers";

const SUBS = [
  "Assets",
  "Obligation Types",
  "Resource Roles",
  "Resource Names",
] as const;

const INTRO: Record<(typeof SUBS)[number], string> = {
  Assets: "Dams on this plan.",
  "Obligation Types": "Regulator requirement types and their cycle.",
  "Resource Roles": "Role catalogue, rates, and default weekly hours.",
  "Resource Names": "Named people, roles, and available hours.",
};

export type InputsSub = (typeof SUBS)[number];
export type DefinitionsTarget =
  | "Asset × Obligation"
  | "Resource × Role"
  | "Asset × Resource Role";

const UNITS: FrequencyUnit[] = ["year", "month", "week"];

export function InputsTab({
  store,
  onChange,
  readOnly = false,
  focusSub,
  focusPersonId,
  onGoToDefinitions,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
  readOnly?: boolean;
  focusSub?: InputsSub | null;
  focusPersonId?: string | null;
  onGoToDefinitions?: (sub: DefinitionsTarget) => void;
}) {
  const [sub, setSub] = useState<(typeof SUBS)[number]>(
    focusSub && SUBS.includes(focusSub) ? focusSub : "Assets",
  );

  useEffect(() => {
    if (focusSub && SUBS.includes(focusSub)) setSub(focusSub);
  }, [focusSub]);

  useEffect(() => {
    if (!focusPersonId || sub !== "Resource Names") return;
    const el = document.querySelector(
      `[data-mrt-person-row="${CSS.escape(focusPersonId)}"]`,
    );
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      el.classList.add("mrt-person-flash");
      const t = window.setTimeout(
        () => el.classList.remove("mrt-person-flash"),
        1600,
      );
      return () => window.clearTimeout(t);
    }
  }, [focusPersonId, sub]);

  function update(mut: (next: ScheduleStore) => void) {
    if (readOnly) return;
    const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    mut(next);
    onChange(next);
  }

  return (
    <div>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} intro={INTRO[sub]} />
      {sub === "Assets" ? (
        <>
          <CrossLinks
            links={[
              {
                label: "Go to Asset × Obligation",
                onClick: () => onGoToDefinitions?.("Asset × Obligation"),
              },
              {
                label: "Go to Asset × Resource Role",
                onClick: () => onGoToDefinitions?.("Asset × Resource Role"),
              },
            ]}
          />
          <div className={readOnly ? "mrt-ro" : undefined}>
            <AssetsTable store={store} update={update} />
          </div>
        </>
      ) : null}
      {sub === "Obligation Types" ? (
        <>
          <CrossLinks
            links={[
              {
                label: "Go to Asset × Obligation",
                onClick: () => onGoToDefinitions?.("Asset × Obligation"),
              },
            ]}
          />
          <div className={readOnly ? "mrt-ro" : undefined}>
            <TypesTable store={store} update={update} />
          </div>
        </>
      ) : null}
      {sub === "Resource Roles" ? (
        <>
          <CrossLinks
            links={[
              {
                label: "Go to Resource × Role",
                onClick: () => onGoToDefinitions?.("Resource × Role"),
              },
            ]}
          />
          <div className={readOnly ? "mrt-ro" : undefined}>
            <RolesTable store={store} update={update} />
          </div>
        </>
      ) : null}
      {sub === "Resource Names" ? (
        <>
          <CrossLinks
            links={[
              {
                label: "Go to Resource × Role",
                onClick: () => onGoToDefinitions?.("Resource × Role"),
              },
            ]}
          />
          <div className={readOnly ? "mrt-ro" : undefined}>
            <NamesTable
              store={store}
              update={update}
              focusPersonId={focusPersonId}
            />
          </div>
        </>
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
            <tr key={i}>
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
  focusPersonId,
}: {
  store: ScheduleStore;
  update: (mut: (next: ScheduleStore) => void) => void;
  focusPersonId?: string | null;
}) {
  const [draftFirst, setDraftFirst] = useState("");
  const [draftLast, setDraftLast] = useState("");
  const [draftHours, setDraftHours] = useState(DEFAULT_WEEKLY_CAPACITY_HOURS);
  const [draftEmail, setDraftEmail] = useState("");
  const [draftInternal, setDraftInternal] = useState(0);
  const [draftExternal, setDraftExternal] = useState(0);

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
      const role = n.resourceRoles[0] || "Lead";
      const extPct = n.externalRatePercent || 150;
      const internal =
        draftInternal || defaultInternalRateForRole(role);
      const external = draftExternal || defaultExternalRate(internal, extPct);
      const person: Person = {
        id: newAssignmentId("res-"),
        name,
        role,
        weeklyCapacityHours: draftHours || DEFAULT_WEEKLY_CAPACITY_HOURS,
        email: draftEmail.trim(),
        internalRate: internal,
        externalRate: external,
      };
      n.people.push(person);
      if (!n.roleEligibility[person.role]) n.roleEligibility[person.role] = {};
      n.roleEligibility[person.role][person.id] = true;
    });
    setDraftFirst("");
    setDraftLast("");
    setDraftHours(DEFAULT_WEEKLY_CAPACITY_HOURS);
    setDraftEmail("");
    setDraftInternal(0);
    setDraftExternal(0);
  }

  const extPct = store.externalRatePercent || 150;

  return (
    <div>
      <table className="mrt-table">
        <thead>
          <tr>
            <th>First name</th>
            <th>Last name</th>
            <th>Email</th>
            <th>
              <div className="mrt-th-stack">
                <label className="mrt-th-control">
                  Overrun Hours %
                  <input
                    type="number"
                    min={100}
                    className="mrt-input"
                    style={{ width: 72 }}
                    value={store.overrunPercent}
                    step={1}
                    onChange={(e) =>
                      update((n) => {
                        n.overrunPercent = parseDecimal(e.target.value) || 125;
                      })
                    }
                  />
                </label>
                <span>Available hours / week</span>
              </div>
            </th>
            <th>Internal $/h</th>
            <th>
              <div className="mrt-th-stack">
                <label className="mrt-th-control">
                  External $/h %
                  <input
                    type="number"
                    min={100}
                    className="mrt-input"
                    style={{ width: 72 }}
                    value={extPct}
                    step={1}
                    onChange={(e) =>
                      update((n) => {
                        const prev = n.externalRatePercent || 150;
                        const nextPct = parseDecimal(e.target.value) || 150;
                        n.externalRatePercent = nextPct;
                        for (const person of n.people) {
                          if (
                            !externalRateIsCustom(
                              person.internalRate || 0,
                              person.externalRate || 0,
                              prev,
                            )
                          ) {
                            person.externalRate = defaultExternalRate(
                              person.internalRate || 0,
                              nextPct,
                            );
                          }
                        }
                      })
                    }
                  />
                </label>
                <span>External $/h</span>
              </div>
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {store.people.map((p, i) => {
            const parts = splitPersonName(p.name);
            return (
              <tr
                key={p.id}
                data-mrt-person-row={p.id}
                className={
                  focusPersonId === p.id ? "mrt-person-flash" : undefined
                }
              >
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
                    className="mrt-input"
                    type="email"
                    value={p.email || ""}
                    onChange={(e) =>
                      update((n) => {
                        n.people[i].email = e.target.value;
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    className="mrt-input"
                    style={{ width: 80 }}
                    value={p.weeklyCapacityHours}
                    step={1}
                    onChange={(e) =>
                      update((n) => {
                        n.people[i].weeklyCapacityHours = parseDecimal(e.target.value);
                      })
                    }
                  />
                </td>
                <td>
                  <DollarRateInput
                    value={p.internalRate || 0}
                    onChange={(next) =>
                      update((n) => {
                        const prev = n.people[i].internalRate || 0;
                        const keep = externalRateIsCustom(
                          prev,
                          n.people[i].externalRate || 0,
                          n.externalRatePercent || 150,
                        );
                        n.people[i].internalRate = next;
                        if (!keep) {
                          n.people[i].externalRate = defaultExternalRate(
                            next,
                            n.externalRatePercent || 150,
                          );
                        }
                      })
                    }
                  />
                </td>
                <td>
                  <span className="inline-flex items-center gap-1">
                    <DollarRateInput
                      value={p.externalRate || 0}
                      onChange={(next) =>
                        update((n) => {
                          n.people[i].externalRate = next;
                        })
                      }
                    />
                    <RateDot
                      internal={p.internalRate || 0}
                      external={p.externalRate || 0}
                      percent={extPct}
                      onReset={() =>
                        update((n) => {
                          n.people[i].externalRate = defaultExternalRate(
                            n.people[i].internalRate || 0,
                            n.externalRatePercent || 150,
                          );
                        })
                      }
                    />
                  </span>
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
                className="mrt-input"
                type="email"
                placeholder="Email"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
              />
            </td>
            <td>
              <input
                type="number"
                min={0}
                className="mrt-input"
                style={{ width: 80 }}
                value={draftHours}
                step={1}
                onChange={(e) => setDraftHours(parseDecimal(e.target.value))}
              />
            </td>
            <td>
              <DollarRateInput
                value={draftInternal}
                onChange={(next) => {
                  const keep = externalRateIsCustom(
                    draftInternal,
                    draftExternal,
                    extPct,
                  );
                  setDraftInternal(next);
                  if (!keep) setDraftExternal(defaultExternalRate(next, extPct));
                }}
              />
            </td>
            <td>
              <span className="inline-flex items-center gap-1">
                <DollarRateInput
                  value={draftExternal}
                  onChange={setDraftExternal}
                />
                <RateDot
                  internal={draftInternal}
                  external={draftExternal}
                  percent={extPct}
                  onReset={() =>
                    setDraftExternal(defaultExternalRate(draftInternal, extPct))
                  }
                />
              </span>
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

function DollarRateInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <span className="mrt-dollar">
      <span className="mrt-dollar-prefix">$</span>
      <input
        type="number"
        min={0}
        step={1}
        className="mrt-input"
        style={{ width: 80 }}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseDecimal(e.target.value))}
      />
    </span>
  );
}

function RateDot({
  internal,
  external,
  percent,
  onReset,
}: {
  internal: number;
  external: number;
  percent: number;
  onReset: () => void;
}) {
  const kind = externalRateDotKind(internal, external, percent);
  if (!kind) return null;
  return (
    <button
      type="button"
      className={`mrt-rate-dot is-${kind}`}
      title={`Reset to ${percent}% of internal`}
      onClick={onReset}
    />
  );
}
