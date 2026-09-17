import {
  boolean,
  customType,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Uint8Array }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer) {
    return value;
  },
  fromDriver(value: unknown) {
    if (Buffer.isBuffer(value)) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    return Buffer.alloc(0);
  },
});

/** Simple hub registers + MRT relational plan + share. Sandbox and mtg-buylist stay JSON. */

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  pageHref: text("page_href").notNull(),
  pageTitle: text("page_title").notNull(),
  message: text("message").notNull(),
  submittedBy: text("submitted_by").notNull(),
});

export const ideas = pgTable("ideas", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
  status: text("status").notNull(),
});

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const changelogs = pgTable("changelogs", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull(),
  createdAt: text("created_at").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  kind: text("kind"),
  version: text("version"),
});

export const dependencies = pgTable("dependencies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  expiresAt: text("expires_at"),
  externalUrl: text("external_url"),
  notes: text("notes").notNull(),
});

export const devChoices = pgTable("dev_choices", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  layer: text("layer").notNull(),
  status: text("status").notNull(),
  decision: text("decision").notNull(),
  why: text("why"),
});

export const mrtPlan = pgTable("mrt_plan", {
  id: text("id").primaryKey(),
  version: integer("version").notNull(),
  updatedAt: text("updated_at"),
  overrunPercent: doublePrecision("overrun_percent").notNull(),
  externalRatePercent: doublePrecision("external_rate_percent").notNull(),
  horizonYears: integer("horizon_years").notNull(),
  baselineY: integer("baseline_y").notNull(),
  baselineM: integer("baseline_m").notNull(),
  baselineD: integer("baseline_d").notNull(),
  indexEpochY: integer("index_epoch_y"),
  indexEpochM: integer("index_epoch_m"),
  projectManagement: boolean("project_management").notNull(),
  openNotes: text("open_notes").notNull(),
});

export const mrtDams = pgTable("mrt_dams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  custom: boolean("custom"),
  sortOrder: integer("sort_order").notNull(),
});

export const mrtLanes = pgTable("mrt_lanes", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  color: text("color").notNull(),
  frequencyCount: integer("frequency_count").notNull(),
  frequencyUnit: text("frequency_unit").notNull(),
  dueMonth: integer("due_month").notNull(),
  defLead: integer("def_lead").notNull(),
  custom: boolean("custom"),
  sortOrder: integer("sort_order").notNull(),
});

export const mrtPeople = pgTable("mrt_people", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email").notNull(),
  weeklyCapacityHours: doublePrecision("weekly_capacity_hours").notNull(),
  internalRate: doublePrecision("internal_rate").notNull(),
  externalRate: doublePrecision("external_rate").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const mrtResourceRoles = pgTable("mrt_resource_roles", {
  role: text("role").primaryKey(),
  sortOrder: integer("sort_order").notNull(),
});

export const mrtLaneApplicability = pgTable(
  "mrt_lane_applicability",
  {
    damId: text("dam_id")
      .notNull()
      .references(() => mrtDams.id),
    laneCode: text("lane_code")
      .notNull()
      .references(() => mrtLanes.code),
    applicable: boolean("applicable").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.damId, t.laneCode] }),
  }),
);

export const mrtLeadGeneral = pgTable("mrt_lead_general", {
  laneCode: text("lane_code")
    .primaryKey()
    .references(() => mrtLanes.code),
  months: integer("months").notNull(),
});

export const mrtLeadOverride = pgTable(
  "mrt_lead_override",
  {
    laneCode: text("lane_code")
      .notNull()
      .references(() => mrtLanes.code),
    damId: text("dam_id")
      .notNull()
      .references(() => mrtDams.id),
    months: integer("months").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.laneCode, t.damId] }),
  }),
);

export const mrtRoleEligibility = pgTable(
  "mrt_role_eligibility",
  {
    role: text("role")
      .notNull()
      .references(() => mrtResourceRoles.role),
    personId: text("person_id")
      .notNull()
      .references(() => mrtPeople.id),
    eligible: boolean("eligible").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.role, t.personId] }),
  }),
);

export const mrtDamMeta = pgTable("mrt_dam_meta", {
  damId: text("dam_id")
    .primaryKey()
    .references(() => mrtDams.id),
  region: text("region"),
  ownerName: text("owner_name"),
});

export const mrtOwnershipColumn = pgTable("mrt_ownership_column", {
  name: text("name").primaryKey(),
  sortOrder: integer("sort_order").notNull(),
});

export const mrtDamOwnership = pgTable(
  "mrt_dam_ownership",
  {
    damId: text("dam_id").notNull(),
    columnName: text("column_name").notNull(),
    personId: text("person_id").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.damId, t.columnName] }),
  }),
);

export const mrtCycleAnchor = pgTable(
  "mrt_cycle_anchor",
  {
    laneCode: text("lane_code")
      .notNull()
      .references(() => mrtLanes.code),
    damId: text("dam_id")
      .notNull()
      .references(() => mrtDams.id),
    y: integer("y").notNull(),
    m: integer("m").notNull(),
    d: integer("d"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.laneCode, t.damId] }),
  }),
);

export const mrtOccurrence = pgTable(
  "mrt_occurrence",
  {
    damId: text("dam_id")
      .notNull()
      .references(() => mrtDams.id),
    laneCode: text("lane_code")
      .notNull()
      .references(() => mrtLanes.code),
    dueIdx: integer("due_idx").notNull(),
    dueIdxOverride: integer("due_idx_override"),
    dueDayOverride: integer("due_day_override"),
    leadInOverrideMonths: integer("lead_in_override_months"),
    tailWeeks: integer("tail_weeks"),
    stick: text("stick"),
    windowStartY: integer("window_start_y"),
    windowStartM: integer("window_start_m"),
    windowStartD: integer("window_start_d"),
    hoursOriginY: integer("hours_origin_y"),
    hoursOriginM: integer("hours_origin_m"),
    hoursOriginD: integer("hours_origin_d"),
    actualised: boolean("actualised"),
    completed: boolean("completed"),
    notRequired: boolean("not_required"),
    notRequiredReason: text("not_required_reason"),
    skippedPredicted: boolean("skipped_predicted"),
    weekCount: integer("week_count"),
    seededFromLane: boolean("seeded_from_lane"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.damId, t.laneCode, t.dueIdx] }),
  }),
);

export const mrtOccurrenceHistory = pgTable("mrt_occurrence_history", {
  id: serial("id").primaryKey(),
  damId: text("dam_id").notNull(),
  laneCode: text("lane_code").notNull(),
  dueIdx: integer("due_idx").notNull(),
  at: text("at").notNull(),
  note: text("note").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const mrtDefaultPlan = pgTable("mrt_default_plan", {
  laneCode: text("lane_code")
    .primaryKey()
    .references(() => mrtLanes.code),
  weekCount: integer("week_count").notNull(),
  seededFromLane: boolean("seeded_from_lane"),
});

export const mrtEffortDemo = pgTable("mrt_effort_demo", {
  id: text("id").primaryKey(),
  weekCount: integer("week_count").notNull(),
  stick: text("stick").notNull(),
  milestoneLabel: text("milestone_label").notNull(),
  milestoneDueY: integer("milestone_due_y").notNull(),
  milestoneDueM: integer("milestone_due_m").notNull(),
  milestoneDueD: integer("milestone_due_d").notNull(),
  tailWeeks: integer("tail_weeks").notNull(),
  windowStartY: integer("window_start_y"),
  windowStartM: integer("window_start_m"),
  windowStartD: integer("window_start_d"),
  hoursOriginY: integer("hours_origin_y"),
  hoursOriginM: integer("hours_origin_m"),
  hoursOriginD: integer("hours_origin_d"),
});

export const mrtPlanTask = pgTable("mrt_plan_task", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  ownerKey: text("owner_key").notNull(),
  taskId: text("task_id").notNull(),
  name: text("name").notNull(),
  level: integer("level"),
  parent: text("parent"),
  start: integer("start"),
  dur: integer("dur"),
  status: text("status"),
  sortOrder: integer("sort_order").notNull(),
});

export const mrtPlanAssign = pgTable(
  "mrt_plan_assign",
  {
    taskFk: text("task_fk")
      .notNull()
      .references(() => mrtPlanTask.id),
    personId: text("person_id").notNull(),
    weekIndex: integer("week_index").notNull(),
    hours: doublePrecision("hours").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskFk, t.personId, t.weekIndex] }),
  }),
);

export const mrtPlanActual = pgTable(
  "mrt_plan_actual",
  {
    taskFk: text("task_fk")
      .notNull()
      .references(() => mrtPlanTask.id),
    personId: text("person_id").notNull(),
    hours: doublePrecision("hours"),
    cost: doublePrecision("cost"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskFk, t.personId] }),
  }),
);

export const mrtShare = pgTable("mrt_share", {
  id: text("id").primaryKey(),
  audience: text("audience").notNull(),
  enabled: boolean("enabled").notNull(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  passwordVault: text("password_vault"),
  expiresAt: text("expires_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const kanbanIdeas = pgTable("kanban_ideas", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  copiedAt: text("copied_at"),
  kind: text("kind").notNull().default("idea"),
  source: text("source").notNull().default("raise"),
  pageHref: text("page_href"),
  pageTitle: text("page_title"),
  submittedBy: text("submitted_by"),
});

export const kanbanTickets = pgTable("kanban_tickets", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  lane: text("lane").notNull(),
  column: text("column").notNull(),
  sourceIdeaId: text("source_idea_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const kanbanMeta = pgTable("kanban_meta", {
  nodeId: text("node_id").primaryKey(),
  revision: integer("revision").notNull(),
  updatedAt: text("updated_at").notNull(),
  publishedAt: text("published_at"),
  liveBaseline: jsonb("live_baseline"),
  events: jsonb("events").notNull(),
  lanes: jsonb("lanes").notNull(),
});

export const kanbanAttachments = pgTable("kanban_attachments", {
  id: text("id").primaryKey(),
  ideaId: text("idea_id").notNull(),
  nodeId: text("node_id").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  createdAt: text("created_at").notNull(),
  bytes: bytea("bytes").notNull(),
});

export const kanbanLeafNotes = pgTable("kanban_leaf_notes", {
  nodeId: text("node_id").primaryKey(),
  body: text("body").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Shared Design Library picks. Same DATABASE_URL as Kanban — not laptop JSON. */
export const standardsChoices = pgTable("standards_choices", {
  entryId: text("entry_id").primaryKey(),
  optionId: text("option_id").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const standardsHolds = pgTable("standards_holds", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  source: text("source"),
  submittedBy: text("submitted_by").notNull(),
});

/** Harvest vs Playmantis Import Review — training rows for improving the harvest. */
export const playmantisHarvestDiff = pgTable("playmantis_harvest_diff", {
  id: text("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  createdAt: text("created_at").notNull(),
  userKey: text("user_key").notNull(),
  csvFilename: text("csv_filename").notNull(),
  reviewFilename: text("review_filename").notNull(),
  harvestedAt: text("harvested_at").notNull(),
  name: text("name").notNull(),
  setName: text("set_name").notNull(),
  finish: text("finish").notNull(),
  scryfallId: text("scryfall_id").notNull(),
  csvQty: integer("csv_qty").notNull(),
  reviewStatus: text("review_status").notNull(),
  harvestStatus: text("harvest_status").notNull(),
  reviewCreditCents: integer("review_credit_cents").notNull(),
  harvestCreditCents: integer("harvest_credit_cents").notNull(),
  harvestLimit: integer("harvest_limit").notNull(),
  verdict: text("verdict").notNull(),
  note: text("note").notNull(),
  lookedAt: text("looked_at").notNull().default(""),
});
