"use client";

import { useState } from "react";
import type { ScheduleStore } from "../schema";
import {
  defaultPlanForLane,
  laneTemplateWeekWindow,
} from "../logic/assignment";
import { AssignmentGantt } from "./AssignmentGantt";

export function DefaultsTab({
  store,
  onChange,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
}) {
  const [laneCode, setLaneCode] = useState(store.lanes[0]?.code || "CI");
  const weeks = laneTemplateWeekWindow(store, laneCode);
  const plan = defaultPlanForLane(store, laneCode);

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Assignment template per obligation type. Columns are Week 1…N (relative
        to lead-in). Assignees here are resource <em>types</em>, not named
        people. Saving an occurrence copies this template once.
      </p>
      <label className="mb-4 block text-sm">
        Obligation type
        <select
          className="sg-input mt-1 max-w-md"
          value={laneCode}
          onChange={(e) => setLaneCode(e.target.value)}
        >
          {store.lanes.map((l) => (
            <option key={l.code} value={l.code}>
              {l.code} — {l.label}
            </option>
          ))}
        </select>
      </label>
      <AssignmentGantt
        store={store}
        plan={plan}
        weeks={weeks}
        mode="roles"
        onChange={(next) => {
          const copy = JSON.parse(JSON.stringify(store)) as ScheduleStore;
          copy.defaultPlansByLane[laneCode] = next;
          onChange(copy);
        }}
      />
    </div>
  );
}
