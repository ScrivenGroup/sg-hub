"use client";

import { useEffect, useState } from "react";
import type { EffortDemo, ScheduleStore } from "../schema";
import { laneTemplateWeekWindow } from "../logic/assignment";
import { prepareInspectReportPlan } from "../logic/default-plan";
import {
  assignmentPlanToEffortDemo,
  effortDemoToAssignmentPlan,
} from "../logic/plan-effort-bridge";
import { EffortGantt } from "./EffortGantt";
import type { InputsSub } from "./InputsTab";
import { CrossLinks, SubTabs } from "./SubTabs";
import { parseDecimal } from "../logic/numbers";

const SUBS = ["Lead-in time per dam", "Task+Resource Effort"] as const;

export function DefaultsTab({
  store,
  onChange,
  focusLane,
  onGoToInputs,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
  focusLane?: string | null;
  onGoToInputs?: (sub: InputsSub) => void;
}) {
  const [sub, setSub] = useState<(typeof SUBS)[number]>(
    focusLane ? "Task+Resource Effort" : "Lead-in time per dam",
  );

  useEffect(() => {
    if (focusLane) setSub("Task+Resource Effort");
  }, [focusLane]);

  function update(mut: (next: ScheduleStore) => void) {
    const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    mut(next);
    onChange(next);
  }

  return (
    <div>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === "Lead-in time per dam" ? (
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
          <LeadMatrix store={store} update={update} />
        </>
      ) : (
        <>
          <CrossLinks
            links={[
              {
                label: "Go to Obligation Types",
                onClick: () => onGoToInputs?.("Obligation Types"),
              },
              {
                label: "Go to Resource Roles",
                onClick: () => onGoToInputs?.("Resource Roles"),
              },
            ]}
          />
          <DefaultsEffort
            store={store}
            onChange={onChange}
            focusLane={focusLane}
          />
        </>
      )}
    </div>
  );
}

function planForLane(store: ScheduleStore, laneCode: string) {
  const existing = store.defaultPlansByLane[laneCode];
  if (existing?.tasks?.length) return existing;
  const weeks = laneTemplateWeekWindow(store, laneCode);
  return prepareInspectReportPlan(weeks.length);
}

function DefaultsEffort({
  store,
  onChange,
  focusLane,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
  focusLane?: string | null;
}) {
  const lanes = store.lanes;
  const [laneCode, setLaneCode] = useState(
    focusLane && lanes.some((l) => l.code === focusLane)
      ? focusLane
      : lanes[0]?.code || "",
  );

  useEffect(() => {
    if (focusLane && lanes.some((l) => l.code === focusLane)) {
      setLaneCode(focusLane);
    }
  }, [focusLane, lanes]);
  const lane = lanes.find((l) => l.code === laneCode) || lanes[0];
  const [demo, setDemo] = useState<EffortDemo>(() =>
    assignmentPlanToEffortDemo(planForLane(store, lane?.code || ""), {
      tailWeeks: laneTemplateWeekWindow(store, lane?.code || "").length,
    }),
  );

  useEffect(() => {
    if (!lane) return;
    setDemo(
      assignmentPlanToEffortDemo(planForLane(store, lane.code), {
        tailWeeks: laneTemplateWeekWindow(store, lane.code).length,
      }),
    );
    // Re-load when the selected obligation type changes, not on every store tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laneCode]);

  function writeDemo(nextDemo: EffortDemo) {
    if (!lane) return;
    setDemo(nextDemo);
    const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    next.defaultPlansByLane[lane.code] = effortDemoToAssignmentPlan(nextDemo, {
      assignMode: "roles",
    });
    onChange(next);
  }

  if (!lane) {
    return (
      <p className="text-sm text-[var(--muted)]">No obligation types yet.</p>
    );
  }

  const weeks = laneTemplateWeekWindow(store, lane.code);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Obligation type
          <select
            className="mrt-select mt-1"
            value={lane.code}
            onChange={(e) => setLaneCode(e.target.value)}
          >
            {lanes.map((l) => (
              <option key={l.code} value={l.code}>
                {l.code} · {l.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-[var(--muted)]">
          Role hours on Week 1…{weeks.length}. Seeds each occurrence once.
        </p>
      </div>
      <EffortGantt
        store={store}
        onChange={onChange}
        demo={demo}
        onDemoChange={writeDemo}
        applyDemoToStore={(s, d) => {
          s.defaultPlansByLane[lane.code] = effortDemoToAssignmentPlan(d, {
            assignMode: "roles",
          });
        }}
        lockedPlace="defaults"
        toolbarNote={`${weeks.length} weeks · template (W1…n)`}
      />
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
                      step={1}
                      className="mrt-input w-16 text-center"
                      value={store.leadGeneral[lane.code] ?? lane.defLead}
                      onChange={(e) =>
                        update((n) => {
                          n.leadGeneral[lane.code] = parseDecimal(e.target.value);
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
                        step={1}
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
                                parseDecimal(e.target.value);
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
                      step={1}
                      className="mrt-input w-16 text-center"
                      value={store.leadGeneral[lane.code] ?? lane.defLead}
                      onChange={(e) =>
                        update((n) => {
                          n.leadGeneral[lane.code] = parseDecimal(e.target.value);
                        })
                      }
                    />
                  </td>
                  {dams.map((dam) => (
                    <td key={dam.id} className="px-1">
                      <input
                        type="number"
                        min={0}
                        step={1}
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
                                parseDecimal(e.target.value);
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
