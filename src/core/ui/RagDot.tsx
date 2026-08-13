import type { RagLevel } from "@/core/contracts/types";

const colors: Record<RagLevel, string> = {
  none: "transparent",
  green: "var(--rag-green)",
  amber: "var(--rag-amber)",
  red: "var(--rag-red)",
};

export function RagDot({
  level,
  size = 10,
}: {
  level: RagLevel;
  size?: number;
}) {
  if (level === "none" || level === "green") return null;
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: colors[level],
        boxShadow: `0 0 0 2px var(--surface)`,
      }}
      title={level === "amber" ? "Attention within 3 months" : "Critical / expired"}
      aria-label={level === "amber" ? "Amber attention" : "Red attention"}
    />
  );
}
