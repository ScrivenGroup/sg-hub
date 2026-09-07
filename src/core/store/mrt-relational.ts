import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  mrtCycleAnchor,
  mrtDamMeta,
  mrtDamOwnership,
  mrtDams,
  mrtDefaultPlan,
  mrtEffortDemo,
  mrtLaneApplicability,
  mrtLanes,
  mrtLeadGeneral,
  mrtLeadOverride,
  mrtOccurrence,
  mrtOccurrenceHistory,
  mrtOwnershipColumn,
  mrtPeople,
  mrtPlan,
  mrtPlanActual,
  mrtPlanAssign,
  mrtPlanTask,
  mrtResourceRoles,
  mrtRoleEligibility,
} from "@/core/store/schema";
import * as schema from "@/core/store/schema";
import { parseSchedKey, schedKey } from "@/modules/sunwater-mrt/logic/scheduling";
import {
  emptyEffortDemo,
  type AssignmentPlan,
  type Dam,
  type EffortDemo,
  type EffortResource,
  type EffortStick,
  type EffortTask,
  type FrequencyUnit,
  type Lane,
  type Person,
  type PlanTask,
  type ScheduleStore,
  type ScheduledDetail,
  type TaskStatus,
} from "@/modules/sunwater-mrt/schema";

export const MRT_PLAN_ID = "live";
export const MRT_EFFORT_ID = "live";

type Db = PostgresJsDatabase<typeof schema>;

export type MrtPlanOwner = "occurrence" | "default_lane" | "effort_demo";

const BATCH = 200;

export const MRT_RELATIONAL_DDL = [
  `CREATE TABLE IF NOT EXISTS mrt_plan (
    id text PRIMARY KEY,
    version integer NOT NULL,
    updated_at text,
    overrun_percent double precision NOT NULL,
    external_rate_percent double precision NOT NULL,
    horizon_years integer NOT NULL,
    baseline_y integer NOT NULL,
    baseline_m integer NOT NULL,
    baseline_d integer NOT NULL,
    index_epoch_y integer,
    index_epoch_m integer,
    project_management boolean NOT NULL,
    open_notes text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_dams (
    id text PRIMARY KEY,
    name text NOT NULL,
    region text NOT NULL,
    custom boolean,
    sort_order integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_lanes (
    code text PRIMARY KEY,
    label text NOT NULL,
    color text NOT NULL,
    frequency_count integer NOT NULL,
    frequency_unit text NOT NULL,
    due_month integer NOT NULL,
    def_lead integer NOT NULL,
    custom boolean,
    sort_order integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_people (
    id text PRIMARY KEY,
    name text NOT NULL,
    role text NOT NULL,
    email text NOT NULL,
    weekly_capacity_hours double precision NOT NULL,
    internal_rate double precision NOT NULL,
    external_rate double precision NOT NULL,
    sort_order integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_resource_roles (
    role text PRIMARY KEY,
    sort_order integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_lane_applicability (
    dam_id text NOT NULL REFERENCES mrt_dams(id),
    lane_code text NOT NULL REFERENCES mrt_lanes(code),
    applicable boolean NOT NULL,
    PRIMARY KEY (dam_id, lane_code)
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_lead_general (
    lane_code text PRIMARY KEY REFERENCES mrt_lanes(code),
    months integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_lead_override (
    lane_code text NOT NULL REFERENCES mrt_lanes(code),
    dam_id text NOT NULL REFERENCES mrt_dams(id),
    months integer NOT NULL,
    PRIMARY KEY (lane_code, dam_id)
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_role_eligibility (
    role text NOT NULL REFERENCES mrt_resource_roles(role),
    person_id text NOT NULL REFERENCES mrt_people(id),
    eligible boolean NOT NULL,
    PRIMARY KEY (role, person_id)
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_dam_meta (
    dam_id text PRIMARY KEY REFERENCES mrt_dams(id),
    region text,
    owner_name text
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_ownership_column (
    name text PRIMARY KEY,
    sort_order integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_dam_ownership (
    dam_id text NOT NULL,
    column_name text NOT NULL,
    person_id text NOT NULL,
    PRIMARY KEY (dam_id, column_name)
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_cycle_anchor (
    lane_code text NOT NULL REFERENCES mrt_lanes(code),
    dam_id text NOT NULL REFERENCES mrt_dams(id),
    y integer NOT NULL,
    m integer NOT NULL,
    d integer,
    PRIMARY KEY (lane_code, dam_id)
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_occurrence (
    dam_id text NOT NULL REFERENCES mrt_dams(id),
    lane_code text NOT NULL REFERENCES mrt_lanes(code),
    due_idx integer NOT NULL,
    due_idx_override integer,
    due_day_override integer,
    lead_in_override_months integer,
    tail_weeks integer,
    stick text,
    window_start_y integer,
    window_start_m integer,
    window_start_d integer,
    hours_origin_y integer,
    hours_origin_m integer,
    hours_origin_d integer,
    actualised boolean,
    completed boolean,
    not_required boolean,
    not_required_reason text,
    skipped_predicted boolean,
    week_count integer,
    seeded_from_lane boolean,
    PRIMARY KEY (dam_id, lane_code, due_idx)
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_occurrence_history (
    id serial PRIMARY KEY,
    dam_id text NOT NULL,
    lane_code text NOT NULL,
    due_idx integer NOT NULL,
    at text NOT NULL,
    note text NOT NULL,
    sort_order integer NOT NULL,
    FOREIGN KEY (dam_id, lane_code, due_idx)
      REFERENCES mrt_occurrence (dam_id, lane_code, due_idx)
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_default_plan (
    lane_code text PRIMARY KEY REFERENCES mrt_lanes(code),
    week_count integer NOT NULL,
    seeded_from_lane boolean
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_effort_demo (
    id text PRIMARY KEY,
    week_count integer NOT NULL,
    stick text NOT NULL,
    milestone_label text NOT NULL,
    milestone_due_y integer NOT NULL,
    milestone_due_m integer NOT NULL,
    milestone_due_d integer NOT NULL,
    tail_weeks integer NOT NULL,
    window_start_y integer,
    window_start_m integer,
    window_start_d integer,
    hours_origin_y integer,
    hours_origin_m integer,
    hours_origin_d integer
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_plan_task (
    id text PRIMARY KEY,
    owner text NOT NULL,
    owner_key text NOT NULL,
    task_id text NOT NULL,
    name text NOT NULL,
    level integer,
    parent text,
    start integer,
    dur integer,
    status text,
    sort_order integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_plan_assign (
    task_fk text NOT NULL REFERENCES mrt_plan_task(id),
    person_id text NOT NULL,
    week_index integer NOT NULL,
    hours double precision NOT NULL,
    PRIMARY KEY (task_fk, person_id, week_index)
  )`,
  `CREATE TABLE IF NOT EXISTS mrt_plan_actual (
    task_fk text NOT NULL REFERENCES mrt_plan_task(id),
    person_id text NOT NULL,
    hours double precision,
    cost double precision,
    PRIMARY KEY (task_fk, person_id)
  )`,
];

const TRUNCATE_MRT = sql.raw(`TRUNCATE TABLE
  mrt_plan_actual,
  mrt_plan_assign,
  mrt_plan_task,
  mrt_occurrence_history,
  mrt_occurrence,
  mrt_default_plan,
  mrt_effort_demo,
  mrt_lane_applicability,
  mrt_lead_general,
  mrt_lead_override,
  mrt_role_eligibility,
  mrt_dam_meta,
  mrt_ownership_column,
  mrt_dam_ownership,
  mrt_cycle_anchor,
  mrt_people,
  mrt_resource_roles,
  mrt_dams,
  mrt_lanes,
  mrt_plan
RESTART IDENTITY`);

export function taskRowId(owner: string, ownerKey: string, taskId: string) {
  return `${owner}\u001f${ownerKey}\u001f${taskId}`;
}

type PlanTaskRow = typeof mrtPlanTask.$inferInsert;
type AssignRow = typeof mrtPlanAssign.$inferInsert;
type ActualRow = typeof mrtPlanActual.$inferInsert;
type OccurrenceRow = typeof mrtOccurrence.$inferInsert;
type HistoryRow = Omit<typeof mrtOccurrenceHistory.$inferInsert, "id">;

export type MrtRowBundle = {
  plan: typeof mrtPlan.$inferInsert;
  dams: (typeof mrtDams.$inferInsert)[];
  lanes: (typeof mrtLanes.$inferInsert)[];
  people: (typeof mrtPeople.$inferInsert)[];
  roles: (typeof mrtResourceRoles.$inferInsert)[];
  applicability: (typeof mrtLaneApplicability.$inferInsert)[];
  leadGeneral: (typeof mrtLeadGeneral.$inferInsert)[];
  leadOverride: (typeof mrtLeadOverride.$inferInsert)[];
  eligibility: (typeof mrtRoleEligibility.$inferInsert)[];
  damMeta: (typeof mrtDamMeta.$inferInsert)[];
  ownershipColumns: (typeof mrtOwnershipColumn.$inferInsert)[];
  damOwnership: (typeof mrtDamOwnership.$inferInsert)[];
  cycleAnchors: (typeof mrtCycleAnchor.$inferInsert)[];
  occurrences: OccurrenceRow[];
  history: HistoryRow[];
  defaultPlans: (typeof mrtDefaultPlan.$inferInsert)[];
  effortDemo: typeof mrtEffortDemo.$inferInsert;
  tasks: PlanTaskRow[];
  assign: AssignRow[];
  actual: ActualRow[];
};

function chunks<T>(rows: T[], size = BATCH): T[][] {
  if (!rows.length) return [];
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function addPlanTasks(
  bundle: MrtRowBundle,
  owner: MrtPlanOwner,
  ownerKey: string,
  tasks: PlanTask[],
) {
  tasks.forEach((task, sortOrder) => {
    const id = taskRowId(owner, ownerKey, task.id);
    bundle.tasks.push({
      id,
      owner,
      ownerKey,
      taskId: task.id,
      name: task.name,
      level: task.level,
      parent: task.parent,
      start: task.start ?? null,
      dur: task.dur ?? null,
      status: task.status ?? null,
      sortOrder,
    });
    for (const [personId, hours] of Object.entries(task.assign ?? {})) {
      hours.forEach((value, weekIndex) => {
        bundle.assign.push({
          taskFk: id,
          personId,
          weekIndex,
          hours: value,
        });
      });
    }
    for (const [personId, rec] of Object.entries(task.actual ?? {})) {
      bundle.actual.push({
        taskFk: id,
        personId,
        hours: rec.hours ?? null,
        cost: rec.cost ?? null,
      });
    }
  });
}

function addEffortTasks(bundle: MrtRowBundle, tasks: EffortTask[]) {
  tasks.forEach((task, sortOrder) => {
    const id = taskRowId("effort_demo", MRT_EFFORT_ID, task.id);
    bundle.tasks.push({
      id,
      owner: "effort_demo",
      ownerKey: MRT_EFFORT_ID,
      taskId: task.id,
      name: task.name,
      level: 0,
      parent: null,
      start: null,
      dur: null,
      status: task.status ?? null,
      sortOrder,
    });
    (task.resources ?? []).forEach((resource) => {
      const personId = resource.personId || resource.id;
      (resource.hours ?? []).forEach((value, weekIndex) => {
        bundle.assign.push({
          taskFk: id,
          personId,
          weekIndex,
          hours: value,
        });
      });
      if (resource.actualHours != null || resource.actualCost != null) {
        bundle.actual.push({
          taskFk: id,
          personId,
          hours: resource.actualHours ?? null,
          cost: resource.actualCost ?? null,
        });
      }
    });
  });
}

export function storeToRows(store: ScheduleStore): MrtRowBundle {
  const bundle: MrtRowBundle = {
    plan: {
      id: MRT_PLAN_ID,
      version: store.version,
      updatedAt: store.updatedAt,
      overrunPercent: store.overrunPercent,
      externalRatePercent: store.externalRatePercent,
      horizonYears: store.horizonYears,
      baselineY: store.baselineDate.y,
      baselineM: store.baselineDate.m,
      baselineD: store.baselineDate.d,
      indexEpochY: store.indexEpoch?.y ?? null,
      indexEpochM: store.indexEpoch?.m ?? null,
      projectManagement: Boolean(store.projectManagement),
      openNotes: store.openNotes ?? "",
    },
    dams: store.dams.map((dam, sortOrder) => ({
      id: dam.id,
      name: dam.name,
      region: dam.region,
      custom: dam.custom ?? null,
      sortOrder,
    })),
    lanes: store.lanes.map((lane, sortOrder) => ({
      code: lane.code,
      label: lane.label,
      color: lane.color,
      frequencyCount: lane.frequencyCount,
      frequencyUnit: lane.frequencyUnit,
      dueMonth: lane.dueMonth,
      defLead: lane.defLead,
      custom: lane.custom ?? null,
      sortOrder,
    })),
    people: store.people.map((person, sortOrder) => ({
      id: person.id,
      name: person.name,
      role: person.role,
      email: person.email ?? "",
      weeklyCapacityHours: person.weeklyCapacityHours,
      internalRate: person.internalRate ?? 0,
      externalRate: person.externalRate ?? 0,
      sortOrder,
    })),
    roles: store.resourceRoles.map((role, sortOrder) => ({ role, sortOrder })),
    applicability: [],
    leadGeneral: [],
    leadOverride: [],
    eligibility: [],
    damMeta: [],
    ownershipColumns: store.damOwnershipColumns.map((name, sortOrder) => ({
      name,
      sortOrder,
    })),
    damOwnership: [],
    cycleAnchors: [],
    occurrences: [],
    history: [],
    defaultPlans: [],
    effortDemo: {
      id: MRT_EFFORT_ID,
      weekCount: store.effortDemo.weekCount,
      stick: store.effortDemo.stick,
      milestoneLabel: store.effortDemo.milestone.label,
      milestoneDueY: store.effortDemo.milestone.due.y,
      milestoneDueM: store.effortDemo.milestone.due.m,
      milestoneDueD: store.effortDemo.milestone.due.d,
      tailWeeks: store.effortDemo.milestone.tailWeeks,
      windowStartY: store.effortDemo.windowStart?.y ?? null,
      windowStartM: store.effortDemo.windowStart?.m ?? null,
      windowStartD: store.effortDemo.windowStart?.d ?? null,
      hoursOriginY: store.effortDemo.hoursOrigin?.y ?? null,
      hoursOriginM: store.effortDemo.hoursOrigin?.m ?? null,
      hoursOriginD: store.effortDemo.hoursOrigin?.d ?? null,
    },
    tasks: [],
    assign: [],
    actual: [],
  };

  for (const [damId, lanes] of Object.entries(store.laneApplicability ?? {})) {
    for (const [laneCode, applicable] of Object.entries(lanes ?? {})) {
      bundle.applicability.push({ damId, laneCode, applicable: Boolean(applicable) });
    }
  }
  for (const [laneCode, months] of Object.entries(store.leadGeneral ?? {})) {
    bundle.leadGeneral.push({ laneCode, months });
  }
  for (const [laneCode, dams] of Object.entries(store.leadOverrides ?? {})) {
    for (const [damId, months] of Object.entries(dams ?? {})) {
      bundle.leadOverride.push({ laneCode, damId, months });
    }
  }
  for (const [role, people] of Object.entries(store.roleEligibility ?? {})) {
    for (const [personId, eligible] of Object.entries(people ?? {})) {
      bundle.eligibility.push({ role, personId, eligible: Boolean(eligible) });
    }
  }
  for (const [damId, meta] of Object.entries(store.damMeta ?? {})) {
    bundle.damMeta.push({
      damId,
      region: meta.region ?? null,
      ownerName: meta.ownerName ?? null,
    });
  }
  for (const [damId, columns] of Object.entries(store.damOwnership ?? {})) {
    for (const [columnName, personId] of Object.entries(columns ?? {})) {
      bundle.damOwnership.push({ damId, columnName, personId });
    }
  }
  // Live JSON is dam_id → lane_code (seedLaneCycleAnchors), not lane → dam.
  for (const [damId, lanes] of Object.entries(store.laneCycleAnchors ?? {})) {
    for (const [laneCode, anchor] of Object.entries(lanes ?? {})) {
      bundle.cycleAnchors.push({
        laneCode,
        damId,
        y: anchor.y,
        m: anchor.m,
        d: anchor.d ?? null,
      });
    }
  }

  for (const [key, detail] of Object.entries(store.scheduledDetails ?? {})) {
    const parsed = parseSchedKey(key);
    if (!parsed) continue;
    bundle.occurrences.push({
      damId: parsed.damId,
      laneCode: parsed.laneCode,
      dueIdx: parsed.dueIdx,
      dueIdxOverride: detail.dueIdxOverride ?? null,
      dueDayOverride: detail.dueDayOverride ?? null,
      leadInOverrideMonths: detail.leadInOverrideMonths ?? null,
      tailWeeks: detail.tailWeeks ?? null,
      stick: detail.stick ?? null,
      windowStartY: detail.windowStart?.y ?? null,
      windowStartM: detail.windowStart?.m ?? null,
      windowStartD: detail.windowStart?.d ?? null,
      hoursOriginY: detail.hoursOrigin?.y ?? null,
      hoursOriginM: detail.hoursOrigin?.m ?? null,
      hoursOriginD: detail.hoursOrigin?.d ?? null,
      actualised: detail.actualised ?? null,
      completed: detail.completed ?? null,
      notRequired: detail.notRequired ?? null,
      notRequiredReason: detail.notRequiredReason ?? null,
      skippedPredicted: detail.skippedPredicted ?? null,
      weekCount: detail.plan?.weekCount ?? null,
      seededFromLane: detail.plan?.seededFromLane ?? null,
    });
    (detail.history ?? []).forEach((entry, sortOrder) => {
      bundle.history.push({
        damId: parsed.damId,
        laneCode: parsed.laneCode,
        dueIdx: parsed.dueIdx,
        at: entry.at,
        note: entry.note,
        sortOrder,
      });
    });
    if (detail.plan) {
      addPlanTasks(bundle, "occurrence", key, detail.plan.tasks ?? []);
    }
  }

  for (const [laneCode, plan] of Object.entries(store.defaultPlansByLane ?? {})) {
    bundle.defaultPlans.push({
      laneCode,
      weekCount: plan.weekCount,
      seededFromLane: plan.seededFromLane ?? null,
    });
    addPlanTasks(bundle, "default_lane", laneCode, plan.tasks ?? []);
  }

  addEffortTasks(bundle, store.effortDemo.tasks ?? []);
  return bundle;
}

function denseHours(rows: AssignRow[], personId: string, taskFk: string): number[] {
  const mine = rows.filter((row) => row.taskFk === taskFk && row.personId === personId);
  const max = mine.reduce((acc, row) => Math.max(acc, row.weekIndex), -1);
  if (max < 0) return [];
  const out = Array.from({ length: max + 1 }, () => 0);
  for (const row of mine) out[row.weekIndex] = row.hours;
  return out;
}

function planTasksFromRows(
  bundle: MrtRowBundle,
  owner: MrtPlanOwner,
  ownerKey: string,
): PlanTask[] {
  return bundle.tasks
    .filter((task) => task.owner === owner && task.ownerKey === ownerKey)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((task) => {
      const people = new Set(
        bundle.assign
          .filter((row) => row.taskFk === task.id)
          .map((row) => row.personId),
      );
      const assign: NonNullable<PlanTask["assign"]> = {};
      for (const personId of people) {
        assign[personId] = denseHours(bundle.assign, personId, task.id);
      }
      const actual: NonNullable<PlanTask["actual"]> = {};
      for (const row of bundle.actual.filter((item) => item.taskFk === task.id)) {
        const rec: { hours?: number; cost?: number } = {};
        if (row.hours != null) rec.hours = row.hours;
        if (row.cost != null) rec.cost = row.cost;
        actual[row.personId] = rec;
      }
      const out: PlanTask = {
        id: task.taskId,
        name: task.name,
        level: task.level ?? 0,
        parent: task.parent ?? null,
      };
      if (task.start != null) out.start = task.start;
      if (task.dur != null) out.dur = task.dur;
      if (Object.keys(assign).length) out.assign = assign;
      if (task.status) out.status = task.status as TaskStatus;
      if (Object.keys(actual).length) out.actual = actual;
      return out;
    });
}

function effortTasksFromRows(bundle: MrtRowBundle, people: Person[]): EffortTask[] {
  const byId = new Map(people.map((person) => [person.id, person]));
  return bundle.tasks
    .filter((task) => task.owner === "effort_demo")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((task) => {
      const personIds = [
        ...new Set(
          bundle.assign
            .filter((row) => row.taskFk === task.id)
            .map((row) => row.personId),
        ),
      ];
      const actualByPerson = new Map(
        bundle.actual
          .filter((row) => row.taskFk === task.id)
          .map((row) => [row.personId, row]),
      );
      const resources: EffortResource[] = personIds.map((personId) => {
        const person = byId.get(personId);
        const actual = actualByPerson.get(personId);
        const resource: EffortResource = {
          id: personId,
          role: person?.role ?? "",
          hours: denseHours(bundle.assign, personId, task.id),
        };
        if (person) {
          resource.name = person.name;
          resource.personId = personId;
        }
        if (actual?.hours != null) resource.actualHours = actual.hours;
        if (actual?.cost != null) resource.actualCost = actual.cost;
        return resource;
      });
      const out: EffortTask = { id: task.taskId, name: task.name, resources };
      if (task.status) out.status = task.status as TaskStatus;
      return out;
    });
}

function ymd(
  y: number | null | undefined,
  m: number | null | undefined,
  d: number | null | undefined,
) {
  if (y == null || m == null || d == null) return undefined;
  return { y, m, d };
}

export function rowsToStore(bundle: MrtRowBundle): ScheduleStore {
  const dams: Dam[] = [...bundle.dams]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => {
      const dam: Dam = { id: row.id, name: row.name, region: row.region };
      if (row.custom != null) dam.custom = row.custom;
      return dam;
    });
  const lanes: Lane[] = [...bundle.lanes]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => {
      const lane: Lane = {
        code: row.code,
        label: row.label,
        color: row.color,
        frequencyCount: row.frequencyCount,
        frequencyUnit: row.frequencyUnit as FrequencyUnit,
        dueMonth: row.dueMonth,
        defLead: row.defLead,
      };
      if (row.custom != null) lane.custom = row.custom;
      return lane;
    });
  const people: Person[] = [...bundle.people]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email ?? "",
      weeklyCapacityHours: row.weeklyCapacityHours,
      internalRate: row.internalRate,
      externalRate: row.externalRate,
    }));
  const resourceRoles = [...bundle.roles]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => row.role);

  const laneApplicability: ScheduleStore["laneApplicability"] = {};
  for (const row of bundle.applicability) {
    if (!laneApplicability[row.damId]) laneApplicability[row.damId] = {};
    laneApplicability[row.damId][row.laneCode] = row.applicable;
  }

  const leadGeneral: ScheduleStore["leadGeneral"] = {};
  for (const row of bundle.leadGeneral) leadGeneral[row.laneCode] = row.months;
  const leadOverrides: ScheduleStore["leadOverrides"] = {};
  for (const lane of lanes) leadOverrides[lane.code] = {};
  for (const row of bundle.leadOverride) {
    if (!leadOverrides[row.laneCode]) leadOverrides[row.laneCode] = {};
    leadOverrides[row.laneCode][row.damId] = row.months;
  }

  const roleEligibility: ScheduleStore["roleEligibility"] = {};
  for (const role of resourceRoles) roleEligibility[role] = {};
  for (const row of bundle.eligibility) {
    if (!roleEligibility[row.role]) roleEligibility[row.role] = {};
    roleEligibility[row.role][row.personId] = row.eligible;
  }

  const damMeta: ScheduleStore["damMeta"] = {};
  for (const row of bundle.damMeta) {
    damMeta[row.damId] = {
      ...(row.region != null ? { region: row.region } : {}),
      ...(row.ownerName != null ? { ownerName: row.ownerName } : {}),
    };
  }

  const damOwnershipColumns = [...bundle.ownershipColumns]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => row.name);
  const damOwnership: ScheduleStore["damOwnership"] = {};
  for (const row of bundle.damOwnership) {
    if (!damOwnership[row.damId]) damOwnership[row.damId] = {};
    damOwnership[row.damId][row.columnName] = row.personId;
  }

  const laneCycleAnchors: NonNullable<ScheduleStore["laneCycleAnchors"]> = {};
  for (const row of bundle.cycleAnchors) {
    if (!laneCycleAnchors[row.damId]) laneCycleAnchors[row.damId] = {};
    laneCycleAnchors[row.damId][row.laneCode] = {
      y: row.y,
      m: row.m,
      ...(row.d != null ? { d: row.d } : {}),
    };
  }

  const historyByKey = new Map<string, { at: string; note: string }[]>();
  for (const row of [...bundle.history].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const key = schedKey(row.damId, row.laneCode, row.dueIdx);
    const list = historyByKey.get(key) ?? [];
    list.push({ at: row.at, note: row.note });
    historyByKey.set(key, list);
  }

  const scheduledDetails: ScheduleStore["scheduledDetails"] = {};
  for (const row of bundle.occurrences) {
    const key = schedKey(row.damId, row.laneCode, row.dueIdx);
    const detail: ScheduledDetail = {};
    if (row.dueIdxOverride != null) detail.dueIdxOverride = row.dueIdxOverride;
    if (row.dueDayOverride != null) detail.dueDayOverride = row.dueDayOverride;
    if (row.leadInOverrideMonths != null) {
      detail.leadInOverrideMonths = row.leadInOverrideMonths;
    }
    if (row.tailWeeks != null) detail.tailWeeks = row.tailWeeks;
    if (row.stick) detail.stick = row.stick as EffortStick;
    const windowStart = ymd(row.windowStartY, row.windowStartM, row.windowStartD);
    if (windowStart) detail.windowStart = windowStart;
    const hoursOrigin = ymd(row.hoursOriginY, row.hoursOriginM, row.hoursOriginD);
    if (hoursOrigin) detail.hoursOrigin = hoursOrigin;
    if (row.actualised != null) detail.actualised = row.actualised;
    if (row.completed != null) detail.completed = row.completed;
    if (row.notRequired != null) detail.notRequired = row.notRequired;
    if (row.notRequiredReason != null) detail.notRequiredReason = row.notRequiredReason;
    if (row.skippedPredicted != null) detail.skippedPredicted = row.skippedPredicted;
    const tasks = planTasksFromRows(bundle, "occurrence", key);
    if (row.weekCount != null || tasks.length) {
      const plan: AssignmentPlan = {
        tasks,
        weekCount: row.weekCount ?? 1,
      };
      if (row.seededFromLane != null) plan.seededFromLane = row.seededFromLane;
      detail.plan = plan;
    }
    const hist = historyByKey.get(key);
    if (hist?.length) detail.history = hist;
    scheduledDetails[key] = detail;
  }

  const defaultPlansByLane: ScheduleStore["defaultPlansByLane"] = {};
  for (const row of bundle.defaultPlans) {
    const plan: AssignmentPlan = {
      tasks: planTasksFromRows(bundle, "default_lane", row.laneCode),
      weekCount: row.weekCount,
    };
    if (row.seededFromLane != null) plan.seededFromLane = row.seededFromLane;
    defaultPlansByLane[row.laneCode] = plan;
  }

  const demo = bundle.effortDemo;
  const effortDemo: EffortDemo = demo
    ? {
        weekCount: demo.weekCount,
        stick: demo.stick as EffortStick,
        milestone: {
          label: demo.milestoneLabel,
          due: {
            y: demo.milestoneDueY,
            m: demo.milestoneDueM,
            d: demo.milestoneDueD,
          },
          tailWeeks: demo.tailWeeks,
        },
        tasks: effortTasksFromRows(bundle, people),
      }
    : emptyEffortDemo();
  if (demo) {
    const windowStart = ymd(demo.windowStartY, demo.windowStartM, demo.windowStartD);
    if (windowStart) effortDemo.windowStart = windowStart;
    const hoursOrigin = ymd(demo.hoursOriginY, demo.hoursOriginM, demo.hoursOriginD);
    if (hoursOrigin) effortDemo.hoursOrigin = hoursOrigin;
  }

  const store: ScheduleStore = {
    version: 1,
    updatedAt: bundle.plan.updatedAt ?? null,
    overrunPercent: bundle.plan.overrunPercent,
    externalRatePercent: bundle.plan.externalRatePercent,
    dams,
    lanes,
    laneApplicability,
    leadGeneral,
    leadOverrides,
    resourceRoles,
    people,
    roleEligibility,
    damMeta,
    damOwnership,
    damOwnershipColumns,
    defaultPlansByLane,
    scheduledDetails,
    horizonYears: bundle.plan.horizonYears,
    laneCycleAnchors,
    baselineDate: {
      y: bundle.plan.baselineY,
      m: bundle.plan.baselineM,
      d: bundle.plan.baselineD,
    },
    projectManagement: bundle.plan.projectManagement,
    effortDemo,
    openNotes: bundle.plan.openNotes,
  };
  if (bundle.plan.indexEpochY != null && bundle.plan.indexEpochM != null) {
    store.indexEpoch = {
      y: bundle.plan.indexEpochY,
      m: bundle.plan.indexEpochM,
    };
  }
  return store;
}

export function canon(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(canon);
  if (typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src).sort()) {
      const next = src[key];
      if (next === undefined) continue;
      out[key] = canon(next);
    }
    return out;
  }
  if (typeof value === "number" && Object.is(value, -0)) return 0;
  return value;
}

export function diffPaths(a: unknown, b: unknown, path = "$"): string[] {
  if (Object.is(a, b)) return [];
  const ca = canon(a);
  const cb = canon(b);
  if (JSON.stringify(ca) === JSON.stringify(cb)) return [];
  if (
    typeof ca !== "object" ||
    typeof cb !== "object" ||
    ca === null ||
    cb === null ||
    Array.isArray(ca) !== Array.isArray(cb)
  ) {
    return [path];
  }
  if (Array.isArray(ca) && Array.isArray(cb)) {
    const n = Math.max(ca.length, cb.length);
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      out.push(...diffPaths(ca[i], cb[i], `${path}[${i}]`));
      if (out.length >= 20) return out.slice(0, 20);
    }
    return out;
  }
  const oa = ca as Record<string, unknown>;
  const ob = cb as Record<string, unknown>;
  const keys = new Set([...Object.keys(oa), ...Object.keys(ob)]);
  const out: string[] = [];
  for (const key of [...keys].sort()) {
    out.push(...diffPaths(oa[key], ob[key], `${path}.${key}`));
    if (out.length >= 20) return out.slice(0, 20);
  }
  return out;
}

async function insertAll(
  tx: Db,
  table: Parameters<Db["insert"]>[0],
  rows: readonly object[],
) {
  for (const chunk of chunks([...rows])) {
    if (!chunk.length) continue;
    // Drizzle table types differ per insert; values match storeToRows.
    await tx.insert(table).values(chunk as never);
  }
}

export async function assembleMrtStore(db: Db): Promise<ScheduleStore | null> {
  const planRows = await db.select().from(mrtPlan).where(eq(mrtPlan.id, MRT_PLAN_ID));
  if (!planRows[0]) return null;
  const [
    dams,
    lanes,
    people,
    roles,
    applicability,
    leadGeneral,
    leadOverride,
    eligibility,
    damMeta,
    ownershipColumns,
    damOwnership,
    cycleAnchors,
    occurrences,
    history,
    defaultPlans,
    effortRows,
    tasks,
    assign,
    actual,
  ] = await Promise.all([
    db.select().from(mrtDams),
    db.select().from(mrtLanes),
    db.select().from(mrtPeople),
    db.select().from(mrtResourceRoles),
    db.select().from(mrtLaneApplicability),
    db.select().from(mrtLeadGeneral),
    db.select().from(mrtLeadOverride),
    db.select().from(mrtRoleEligibility),
    db.select().from(mrtDamMeta),
    db.select().from(mrtOwnershipColumn),
    db.select().from(mrtDamOwnership),
    db.select().from(mrtCycleAnchor),
    db.select().from(mrtOccurrence),
    db.select().from(mrtOccurrenceHistory),
    db.select().from(mrtDefaultPlan),
    db.select().from(mrtEffortDemo),
    db.select().from(mrtPlanTask),
    db.select().from(mrtPlanAssign),
    db.select().from(mrtPlanActual),
  ]);
  const effortDemo = effortRows[0];
  if (!effortDemo) return null;
  return rowsToStore({
    plan: planRows[0],
    dams,
    lanes,
    people,
    roles,
    applicability,
    leadGeneral,
    leadOverride,
    eligibility,
    damMeta,
    ownershipColumns,
    damOwnership,
    cycleAnchors,
    occurrences,
    history,
    defaultPlans,
    effortDemo,
    tasks,
    assign,
    actual,
  });
}

export async function replaceMrtStore(db: Db, store: ScheduleStore): Promise<void> {
  const bundle = storeToRows(store);
  await db.transaction(async (tx) => {
    await tx.execute(TRUNCATE_MRT);
    await tx.insert(mrtPlan).values(bundle.plan);
    await insertAll(tx as Db, mrtDams, bundle.dams);
    await insertAll(tx as Db, mrtLanes, bundle.lanes);
    await insertAll(tx as Db, mrtPeople, bundle.people);
    await insertAll(tx as Db, mrtResourceRoles, bundle.roles);
    await insertAll(tx as Db, mrtLaneApplicability, bundle.applicability);
    await insertAll(tx as Db, mrtLeadGeneral, bundle.leadGeneral);
    await insertAll(tx as Db, mrtLeadOverride, bundle.leadOverride);
    await insertAll(tx as Db, mrtRoleEligibility, bundle.eligibility);
    await insertAll(tx as Db, mrtDamMeta, bundle.damMeta);
    await insertAll(tx as Db, mrtOwnershipColumn, bundle.ownershipColumns);
    await insertAll(tx as Db, mrtDamOwnership, bundle.damOwnership);
    await insertAll(tx as Db, mrtCycleAnchor, bundle.cycleAnchors);
    await insertAll(tx as Db, mrtOccurrence, bundle.occurrences);
    await insertAll(tx as Db, mrtOccurrenceHistory, bundle.history);
    await insertAll(tx as Db, mrtDefaultPlan, bundle.defaultPlans);
    await tx.insert(mrtEffortDemo).values(bundle.effortDemo);
    await insertAll(tx as Db, mrtPlanTask, bundle.tasks);
    await insertAll(tx as Db, mrtPlanAssign, bundle.assign);
    await insertAll(tx as Db, mrtPlanActual, bundle.actual);
  });
}
