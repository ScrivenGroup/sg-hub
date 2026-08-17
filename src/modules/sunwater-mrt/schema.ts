import { z } from "zod";
import { CATALOG_DAMS } from "./catalog/dams";
import { CATALOG_LANES } from "./catalog/lanes";
import {
  DEFAULT_OVERRUN_PERCENT,
  DEFAULT_PEOPLE,
  DEFAULT_RESOURCE_ROLES,
  DEFAULT_WEEKLY_CAPACITY_HOURS,
} from "./catalog/roster";
import { defaultLaneApplies } from "./logic/applicability";

const laneKindSchema = z.enum([
  "cyclic-sr",
  "cyclic-ci",
  "annual-ai",
  "annual-fixed",
  "once",
  "paradise",
]);

export const damSchema = z.object({
  id: z.string(),
  name: z.string(),
  ciYears: z.array(z.number()),
  srYears: z.array(z.number()),
  ai: z.boolean(),
  custom: z.boolean().optional(),
});

export const laneSchema = z.object({
  code: z.string(),
  label: z.string(),
  color: z.string(),
  defLead: z.number(),
  assumed: z.boolean(),
  kind: laneKindSchema,
  month: z.number().optional(),
  once: z.object({ y: z.number(), m: z.number() }).optional(),
  source: z.string(),
  custom: z.boolean().optional(),
});

export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  email: z.string().optional(),
  weeklyCapacityHours: z.number(),
});

export const planTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number(),
  parent: z.string().nullable(),
  start: z.number().optional(),
  dur: z.number().optional(),
  assign: z.record(z.string(), z.array(z.number())).optional(),
});

export const assignmentPlanSchema = z.object({
  tasks: z.array(planTaskSchema),
  weekCount: z.number(),
  seededFromLane: z.boolean().optional(),
});

export const scheduledDetailSchema = z.object({
  dueIdxOverride: z.number().optional(),
  dueDayOverride: z.number().optional(),
  leadInOverrideMonths: z.number().optional(),
  completed: z.boolean().optional(),
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

export const scheduleStoreSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().nullable(),
  overrunPercent: z.number(),
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
});

export type Dam = z.infer<typeof damSchema>;
export type Lane = z.infer<typeof laneSchema>;
export type Person = z.infer<typeof personSchema>;
export type AssignmentPlan = z.infer<typeof assignmentPlanSchema>;
export type PlanTask = z.infer<typeof planTaskSchema>;
export type ScheduledDetail = z.infer<typeof scheduledDetailSchema>;
export type ScheduleStore = z.infer<typeof scheduleStoreSchema>;

function personIdFromName(name: string, i: number) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "res"}-${i}`;
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
      laneApplicability[dam.id][lane.code] = defaultLaneApplies(dam, lane);
    }
  }
  const leadGeneral: Record<string, number> = {};
  const leadOverrides: Record<string, Record<string, number>> = {};
  for (const lane of lanes) {
    leadGeneral[lane.code] = lane.defLead;
    leadOverrides[lane.code] = {};
  }
  const people: Person[] = DEFAULT_PEOPLE.map((p, i) => ({
    id: personIdFromName(p.name, i),
    name: p.name,
    role: p.role,
    email: "",
    weeklyCapacityHours: DEFAULT_WEEKLY_CAPACITY_HOURS,
  }));
  const roleEligibility: ScheduleStore["roleEligibility"] = {};
  for (const role of DEFAULT_RESOURCE_ROLES) roleEligibility[role] = {};
  for (const person of people) {
    if (!roleEligibility[person.role]) roleEligibility[person.role] = {};
    roleEligibility[person.role][person.id] = true;
  }
  return {
    version: 1,
    updatedAt: null,
    overrunPercent: DEFAULT_OVERRUN_PERCENT,
    dams,
    lanes,
    laneApplicability,
    leadGeneral,
    leadOverrides,
    resourceRoles: [...DEFAULT_RESOURCE_ROLES],
    people,
    roleEligibility,
    damMeta: {},
    damOwnership: {},
    damOwnershipColumns: ["Lead", "Engineer", "Support"],
    defaultPlansByLane: {},
    scheduledDetails: {},
  };
}
