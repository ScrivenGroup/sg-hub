"use client";

import type { Person, ScheduleStore } from "../schema";
import { DEFAULT_WEEKLY_CAPACITY_HOURS } from "../catalog/roster";
import { newAssignmentId } from "../logic/assignment";

export function PeopleTab({
  store,
  onChange,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
}) {
  function update(mut: (next: ScheduleStore) => void) {
    const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    mut(next);
    onChange(next);
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold">Capacity</h2>
        <p className="mb-2 text-sm text-[var(--muted)]">
          Overrun threshold is a percent of each person&apos;s weekly hours.
          Assignment heatmaps go yellow above 100% and red above this threshold.
        </p>
        <label className="text-sm">
          Overrun %
          <input
            type="number"
            min={100}
            className="sg-input mt-1 max-w-32"
            value={store.overrunPercent}
            onChange={(e) =>
              update((n) => {
                n.overrunPercent = Number(e.target.value) || 125;
              })
            }
          />
        </label>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Resource roles</h2>
        <ul className="mt-2 space-y-2">
          {store.resourceRoles.map((role, i) => (
            <li key={`${role}-${i}`} className="flex gap-2">
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
            </li>
          ))}
        </ul>
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
      </section>

      <section>
        <h2 className="text-lg font-semibold">People</h2>
        <table className="mt-2 min-w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)]">
              <th className="px-2 py-1">Name</th>
              <th className="px-2 py-1">Primary role</th>
              <th className="px-2 py-1">Hours / week</th>
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
                  <select
                    className="sg-input min-h-9 py-1"
                    value={p.role}
                    onChange={(e) =>
                      update((n) => {
                        n.people[i].role = e.target.value;
                      })
                    }
                  >
                    {store.resourceRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    className="sg-input min-h-9 w-24 py-1"
                    value={p.weeklyCapacityHours}
                    onChange={(e) =>
                      update((n) => {
                        n.people[i].weeklyCapacityHours =
                          Number(e.target.value) || 0;
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
      </section>
    </div>
  );
}
