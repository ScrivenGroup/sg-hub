/** Leaf / suite SemVer display. Train stays vX.Y and is not passed here. */
export function padSemver(version: string | undefined): string {
  const raw = (version || "").trim();
  if (!raw) return "—";
  const parts = raw.split(".");
  if (parts.length === 2 && parts[0] && parts[1]) return `${raw}.0`;
  return raw;
}
