import type { ScheduleStore } from "../schema";

export function removeDam(store: ScheduleStore, damId: string) {
  store.dams = store.dams.filter((d) => d.id !== damId);
  delete store.laneApplicability[damId];
  delete store.damMeta[damId];
  if (!store.laneCycleAnchors) store.laneCycleAnchors = {};
  delete store.laneCycleAnchors[damId];
  for (const code of Object.keys(store.leadOverrides)) {
    delete store.leadOverrides[code]?.[damId];
  }
  for (const role of Object.keys(store.damOwnership)) {
    delete store.damOwnership[role]?.[`dam:${damId}`];
  }
  stripScheduled(store, (key) => key.startsWith(`${damId}|`));
}

export function removeLane(store: ScheduleStore, code: string) {
  store.lanes = store.lanes.filter((l) => l.code !== code);
  delete store.leadGeneral[code];
  delete store.leadOverrides[code];
  delete store.defaultPlansByLane[code];
  for (const damId of Object.keys(store.laneApplicability)) {
    delete store.laneApplicability[damId]?.[code];
  }
  for (const damId of Object.keys(store.laneCycleAnchors || {})) {
    delete store.laneCycleAnchors[damId]?.[code];
  }
  stripScheduled(store, (key) => key.split("|")[1] === code);
}

export function removeRole(store: ScheduleStore, role: string) {
  store.resourceRoles = store.resourceRoles.filter((r) => r !== role);
  delete store.roleEligibility[role];
  delete store.damOwnership[role];
  store.damOwnershipColumns = store.damOwnershipColumns.filter((c) => c !== role);
}

export function removePerson(store: ScheduleStore, personId: string) {
  const person = store.people.find((p) => p.id === personId);
  store.people = store.people.filter((p) => p.id !== personId);
  for (const role of Object.keys(store.roleEligibility)) {
    delete store.roleEligibility[role]?.[personId];
  }
  if (!person) return;
  for (const role of Object.keys(store.damOwnership)) {
    const map = store.damOwnership[role];
    if (!map) continue;
    for (const key of Object.keys(map)) {
      if (map[key] === person.name) delete map[key];
    }
  }
}

export function removeOwnershipColumn(store: ScheduleStore, role: string) {
  store.damOwnershipColumns = store.damOwnershipColumns.filter((c) => c !== role);
  delete store.damOwnership[role];
}

function stripScheduled(store: ScheduleStore, match: (key: string) => boolean) {
  for (const key of Object.keys(store.scheduledDetails)) {
    if (match(key)) delete store.scheduledDetails[key];
  }
}
