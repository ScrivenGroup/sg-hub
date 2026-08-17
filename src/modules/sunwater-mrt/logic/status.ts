export function planStatusKind(scheduled: boolean, completed: boolean) {
  return completed ? "completed" : scheduled ? "scheduled" : "predicted";
}

export function planStatusLabel(kind: ReturnType<typeof planStatusKind>) {
  if (kind === "completed") return "Completed";
  if (kind === "scheduled") return "Scheduled";
  return "Predicted";
}

export function ragStatus(
  total: number,
  cap: number,
  overrunPercent = 125,
): "empty" | "ok" | "yellow" | "red" {
  if (!total) return "empty";
  if (cap <= 0) return "red";
  const ratio = total / cap;
  const overrun = overrunPercent / 100;
  if (ratio > overrun) return "red";
  if (ratio > 1) return "yellow";
  return "ok";
}

export function ragClass(kind: ReturnType<typeof ragStatus>) {
  if (kind === "red") return "bg-[var(--rag-red)]/25";
  if (kind === "yellow") return "bg-[var(--rag-amber)]/25";
  return "";
}
