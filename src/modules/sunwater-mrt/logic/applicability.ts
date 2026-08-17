import type { Dam, Lane } from "../schema";

export function defaultLaneApplies(dam: Dam, lane: Lane): boolean {
  if (lane.code === "OTH" || lane.kind === "paradise") return dam.name === "Paradise Dam";
  if (lane.code === "AI" || lane.kind === "annual-ai") return dam.ai;
  if (lane.code === "SR" || lane.kind === "cyclic-sr") return dam.srYears.length > 0;
  return true;
}

export function laneApplies(
  applicability: Record<string, Record<string, boolean>>,
  dam: Dam,
  lane: Lane,
): boolean {
  const ov = applicability[dam.id]?.[lane.code];
  if (ov !== undefined) return ov;
  return defaultLaneApplies(dam, lane);
}
