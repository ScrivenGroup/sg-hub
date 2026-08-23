export const DEFAULT_RESOURCE_ROLES = [
  "Lead",
  "Engineer",
  "Support",
  "Principal Engineer",
  "Senior Engineer",
  "Graduate Engineer",
  "Project Manager",
  "Dam Safety Specialist",
  "Geotechnical Engineer",
  "Structural Engineer",
  "Site Supervisor",
  "Administration Support",
];

export const DEFAULT_WEEKLY_CAPACITY_HOURS = 40;
export const DEFAULT_OVERRUN_PERCENT = 125;
export const DEFAULT_EXTERNAL_RATE_PERCENT = 150;
export const EXTERNAL_RATE_FACTOR = DEFAULT_EXTERNAL_RATE_PERCENT / 100;

export function defaultInternalRateForRole(role: string) {
  const r = (role || "").trim().toLowerCase();
  if (r === "lead") return 250;
  if (r === "principal engineer") return 275;
  if (
    r === "senior engineer" ||
    r === "dam safety specialist" ||
    r.includes("geotechnical") ||
    r.includes("structural")
  ) {
    return 225;
  }
  if (r === "engineer") return 200;
  if (r === "project manager") return 220;
  return 150;
}

export function defaultExternalRate(
  internal: number,
  percent = DEFAULT_EXTERNAL_RATE_PERCENT,
) {
  const factor = (Number(percent) || DEFAULT_EXTERNAL_RATE_PERCENT) / 100;
  return Math.round((Number(internal) || 0) * factor * 100) / 100;
}

export function externalRateIsCustom(
  internal: number,
  external: number,
  percent = DEFAULT_EXTERNAL_RATE_PERCENT,
) {
  return (
    Math.abs((Number(external) || 0) - defaultExternalRate(internal, percent)) >
    0.009
  );
}

export function externalRateDotKind(
  internal: number,
  external: number,
  percent = DEFAULT_EXTERNAL_RATE_PERCENT,
): "under" | "over" | null {
  const target = defaultExternalRate(internal, percent);
  const ext = Number(external) || 0;
  if (Math.abs(ext - target) <= 0.009) return null;
  return ext < target ? "under" : "over";
}

export const DEFAULT_PEOPLE = [
  { name: "Brendan", role: "Lead" },
  { name: "Lucas", role: "Engineer" },
  { name: "Bill", role: "Support" },
];
