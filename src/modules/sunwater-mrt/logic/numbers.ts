/** Whole-number steppers; typed decimals commit at 2 d.p. */

export function round2(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function parseDecimal(raw: string | number | null | undefined) {
  if (raw === "" || raw == null) return 0;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim().replace(/,/g, ""));
  return round2(Number.isFinite(n) ? n : 0);
}

export function formatHours(n: number, showZero = false) {
  const v = round2(n);
  if (!v) return showZero ? "0" : "";
  return v.toLocaleString("en-AU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}
