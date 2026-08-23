export function planStatusKind(
  scheduled: boolean,
  completed: boolean,
  notRequired = false,
) {
  if (completed) return "completed";
  if (notRequired) return "notRequired";
  if (scheduled) return "scheduled";
  return "predicted";
}

export function planStatusLabel(kind: ReturnType<typeof planStatusKind>) {
  if (kind === "completed") return "Completed";
  if (kind === "notRequired") return "Not required";
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

export function nextDueRag(
  status: "overdue" | "ongoing" | "upcoming",
): "red" | "yellow" | "none" {
  if (status === "overdue") return "red";
  if (status === "ongoing") return "yellow";
  return "none";
}

export function nextDueChipClass(rag: ReturnType<typeof nextDueRag>) {
  if (rag === "red") {
    return "bg-[var(--rag-red)] text-white";
  }
  if (rag === "yellow") {
    return "bg-[var(--rag-amber)] text-[var(--ink)]";
  }
  return "text-[var(--muted)]";
}
