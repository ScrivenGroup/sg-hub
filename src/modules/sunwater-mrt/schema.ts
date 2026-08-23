import { z } from "zod";
import { CATALOG_DAMS } from "./catalog/dams";
import { CATALOG_LANES } from "./catalog/lanes";
import {
  DEFAULT_EXTERNAL_RATE_PERCENT,
  DEFAULT_OVERRUN_PERCENT,
  DEFAULT_PEOPLE,
  DEFAULT_RESOURCE_ROLES,
  DEFAULT_WEEKLY_CAPACITY_HOURS,
  defaultExternalRate,
  defaultInternalRateForRole,
} from "./catalog/roster";

export const frequencyUnitSchema = z.enum(["year", "month", "week"]);

export const damSchema = z.object({
  id: z.string(),
  name: z.string(),
  region: z.string(),
  custom: z.boolean().optional(),
});

export const laneSchema = z.object({
  code: z.string(),
  label: z.string(),
  color: z.string(),
  frequencyCount: z.number(),
  frequencyUnit: frequencyUnitSchema,
  dueMonth: z.number(),
  defLead: z.number(),
  custom: z.boolean().optional(),
});

export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  email: z.string().optional().default(""),
  weeklyCapacityHours: z.number(),
  internalRate: z.number().optional().default(0),
  externalRate: z.number().optional().default(0),
});

export const taskStatusSchema = z.enum([
  "not-started",
  "in-progress",
  "complete",
]);

export const planTaskActualSchema = z.object({
  hours: z.number().optional(),
  cost: z.number().optional(),
});

export const planTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number(),
  parent: z.string().nullable(),
  start: z.number().optional(),
  dur: z.number().optional(),
  assign: z.record(z.string(), z.array(z.number())).optional(),
  status: taskStatusSchema.optional(),
  actual: z.record(z.string(), planTaskActualSchema).optional(),
});

export const assignmentPlanSchema = z.object({
  tasks: z.array(planTaskSchema),
  weekCount: z.number(),
  seededFromLane: z.boolean().optional(),
});

const weDateSchema = z.object({
  y: z.number(),
  m: z.number(),
  d: z.number(),
});

export const effortStickSchema = z.enum(["tail-start", "tail-end", "unstick"]);

export const scheduledDetailSchema = z.object({
  dueIdxOverride: z.number().optional(),
  dueDayOverride: z.number().optional(),
  leadInOverrideMonths: z.number().optional(),
  tailWeeks: z.number().optional(),
  stick: effortStickSchema.optional(),
  windowStart: weDateSchema.optional(),
  hoursOrigin: weDateSchema.optional(),
  actualised: z.boolean().optional(),
  completed: z.boolean().optional(),
  notRequired: z.boolean().optional(),
  notRequiredReason: z.string().optional(),
  skippedPredicted: z.boolean().optional(),
  plan: assignmentPlanSchema.optional(),
  history: z
    .array(
      z.object({
        at: z.string(),
        note: z.string(),
      }),
    )
    .optional(),
});

export const damMetaSchema = z.object({
  region: z.string().optional(),
  ownerName: z.string().optional(),
});

export const effortResourceSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  role: z.string().default(""),
  personId: z.string().optional(),
  hours: z.array(z.number()),
  actualHours: z.number().optional(),
  actualCost: z.number().optional(),
});

export const effortTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  resources: z.array(effortResourceSchema),
  status: taskStatusSchema.optional(),
});

export const effortDemoSchema = z.object({
  weekCount: z.number().default(8),
  stick: effortStickSchema.default("tail-start"),
  windowStart: z
    .object({
      y: z.number(),
      m: z.number(),
      d: z.number(),
    })
    .optional(),
  hoursOrigin: z
    .object({
      y: z.number(),
      m: z.number(),
      d: z.number(),
    })
    .optional(),
  milestone: z.object({
    label: z.string().default("Milestone"),
    due: z.object({
      y: z.number(),
      m: z.number(),
      d: z.number(),
    }),
    tailWeeks: z.number(),
  }),
  tasks: z.array(effortTaskSchema).default([]),
});

export const scheduleStoreSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().nullable(),
  overrunPercent: z.number(),
  externalRatePercent: z.number().default(DEFAULT_EXTERNAL_RATE_PERCENT),
  dams: z.array(damSchema),
  lanes: z.array(laneSchema),
  laneApplicability: z.record(z.string(), z.record(z.string(), z.boolean())),
  leadGeneral: z.record(z.string(), z.number()),
  leadOverrides: z.record(z.string(), z.record(z.string(), z.number())),
  resourceRoles: z.array(z.string()),
  people: z.array(personSchema),
  roleEligibility: z.record(z.string(), z.record(z.string(), z.boolean())),
  damMeta: z.record(z.string(), damMetaSchema),
  damOwnership: z.record(z.string(), z.record(z.string(), z.string())),
  damOwnershipColumns: z.array(z.string()),
  defaultPlansByLane: z.record(z.string(), assignmentPlanSchema),
  scheduledDetails: z.record(z.string(), scheduledDetailSchema),
  horizonYears: z.number().default(25),
  laneCycleAnchors: z
    .record(
      z.string(),
      z.record(
        z.string(),
        z.object({
          y: z.number(),
          m: z.number(),
        }),
      ),
    )
    .default({}),
  baselineDate: z
    .object({
      y: z.number(),
      m: z.number(),
      d: z.number(),
    })
    .default({ y: 2026, m: 7, d: 1 }),
  indexEpoch: z
    .object({
      y: z.number(),
      m: z.number(),
    })
    .optional(),
  projectManagement: z.boolean().optional().default(false),
  effortDemo: effortDemoSchema.default({
    weekCount: 8,
    stick: "tail-start",
    milestone: {
      label: "Milestone",
      due: { y: 2027, m: 6, d: 30 },
      tailWeeks: 8,
    },
    tasks: [],
  }),
  openNotes: z.string().default(""),
});

export type Dam = z.infer<typeof damSchema>;
export type Lane = z.infer<typeof laneSchema>;
export type Person = z.infer<typeof personSchema>;
export type AssignmentPlan = z.infer<typeof assignmentPlanSchema>;
export type PlanTask = z.infer<typeof planTaskSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type ScheduledDetail = z.infer<typeof scheduledDetailSchema>;
export type ScheduleStore = z.infer<typeof scheduleStoreSchema>;
export type FrequencyUnit = z.infer<typeof frequencyUnitSchema>;
export type EffortDemo = z.infer<typeof effortDemoSchema>;
export type EffortTask = z.infer<typeof effortTaskSchema>;
export type EffortResource = z.infer<typeof effortResourceSchema>;
export type EffortStick = z.infer<typeof effortStickSchema>;

export function personIdFromName(name: string, i: number) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "res"}-${i}`;
}

export function splitPersonName(name: string) {
  const t = (name || "").trim();
  const i = t.indexOf(" ");
  if (i < 0) return { first: t, last: "" };
  return { first: t.slice(0, i), last: t.slice(i + 1).trim() };
}

export function joinPersonName(first: string, last: string) {
  return `${first.trim()} ${last.trim()}`.replace(/\s+/g, " ").trim();
}

export function samePersonName(a: string, b: string) {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return norm(a) === norm(b);
}

export function emptyEffortDemo(): EffortDemo {
  return {
    weekCount: 8,
    stick: "tail-start",
    milestone: {
      label: "Milestone",
      due: { y: 2027, m: 6, d: 30 },
      tailWeeks: 8,
    },
    tasks: [],
  };
}

export function emptyPlan(weekCount = 1): AssignmentPlan {
  return { tasks: [], weekCount: Math.max(1, weekCount) };
}

export function emptyScheduleStore(): ScheduleStore {
  const dams: Dam[] = CATALOG_DAMS.map((d) => ({ ...d }));
  const lanes: Lane[] = CATALOG_LANES.map((l) => ({ ...l }));
  const laneApplicability: ScheduleStore["laneApplicability"] = {};
  for (const dam of dams) {
    laneApplicability[dam.id] = {};
    for (const lane of lanes) {
      laneApplicability[dam.id][lane.code] = true;
    }
  }
  const leadGeneral: Record<string, number> = {};
  const leadOverrides: Record<string, Record<string, number>> = {};
  for (const lane of lanes) {
    leadGeneral[lane.code] = lane.defLead;
    leadOverrides[lane.code] = {};
  }
  const people: Person[] = DEFAULT_PEOPLE.map((p, i) => {
    const internalRate = defaultInternalRateForRole(p.role);
    return {
      id: personIdFromName(p.name, i),
      name: p.name,
      role: p.role,
      email: "",
      weeklyCapacityHours: DEFAULT_WEEKLY_CAPACITY_HOURS,
      internalRate,
      externalRate: defaultExternalRate(internalRate),
    };
  });
  const roleEligibility: ScheduleStore["roleEligibility"] = {};
  for (const role of DEFAULT_RESOURCE_ROLES) roleEligibility[role] = {};
  for (const person of people) {
    if (!roleEligibility[person.role]) roleEligibility[person.role] = {};
    roleEligibility[person.role][person.id] = true;
  }
  const damMeta: ScheduleStore["damMeta"] = {};
  for (const dam of dams) {
    damMeta[dam.id] = { region: dam.region };
  }
  return {
    version: 1,
    updatedAt: null,
    overrunPercent: DEFAULT_OVERRUN_PERCENT,
    externalRatePercent: DEFAULT_EXTERNAL_RATE_PERCENT,
    dams,
    lanes,
    laneApplicability,
    leadGeneral,
    leadOverrides,
    resourceRoles: [...DEFAULT_RESOURCE_ROLES],
    people,
    roleEligibility,
    damMeta,
    damOwnership: {},
    damOwnershipColumns: ["Lead", "Engineer", "Support"],
    defaultPlansByLane: {},
    scheduledDetails: {},
    horizonYears: 25,
    laneCycleAnchors: {},
    baselineDate: { y: 2026, m: 7, d: 1 },
    projectManagement: false,
    effortDemo: emptyEffortDemo(),
    openNotes: "",
  };
}
