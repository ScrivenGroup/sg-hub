import type { DependencyRecord, RagLevel } from "@/core/contracts/types";

const MS_DAY = 24 * 60 * 60 * 1000;

export function dependencyRag(dep: DependencyRecord, now = new Date()): RagLevel {
  if (!dep.expiresAt) return "none";
  const expiry = new Date(dep.expiresAt);
  const days = (expiry.getTime() - now.getTime()) / MS_DAY;
  if (days < 0 || days <= 14) return "red";
  if (days <= 90) return "amber";
  return "green";
}

export function worstRag(levels: RagLevel[]): RagLevel {
  if (levels.includes("red")) return "red";
  if (levels.includes("amber")) return "amber";
  if (levels.includes("green")) return "green";
  return "none";
}

export function systemHubRag(deps: DependencyRecord[]): RagLevel {
  return worstRag(deps.map((d) => dependencyRag(d)));
}
