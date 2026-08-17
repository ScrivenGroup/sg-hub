import { z } from "zod";

/** Minimal payload for the framed rebuild. Later layers add dams, lanes, and assignments. */
export const scheduleStoreSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().nullable(),
});

export type ScheduleStore = z.infer<typeof scheduleStoreSchema>;

export function emptyScheduleStore(): ScheduleStore {
  return { version: 1, updatedAt: null };
}
