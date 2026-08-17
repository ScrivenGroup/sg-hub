import type { Dam, Lane } from "../schema";

export function laneApplies(
  applicability: Record<string, Record<string, boolean>>,
  dam: Dam,
  lane: Lane,
): boolean {
  const ov = applicability[dam.id]?.[lane.code];
  if (ov !== undefined) return ov;
  return true;
}
