import type { DevHostKind } from "../host";

const STRIP: Record<
  DevHostKind,
  { label: string; compact: string; detail: string; color: string }
> = {
  live: {
    label: "ON LIVE",
    compact: "Live",
    detail: "This is the published Azure site. What you see is the live disk.",
    color: "var(--rag-green)",
  },
  localhost: {
    label: "VIA LOCALHOST",
    compact: "Localhost",
    detail:
      "Laptop disk — not Azure. Changes here do not update live until you publish a snapshot on live (and zip-deploy does not copy data/).",
    color: "var(--rag-amber)",
  },
  other: {
    label: "UNKNOWN HOST",
    compact: "Host?",
    detail: "Not recognised as Azure live or localhost. Do not assume this is production.",
    color: "var(--rag-amber)",
  },
};

export function DevHostStrip({
  kind,
  host,
  compact = false,
}: {
  kind: DevHostKind;
  host: string;
  compact?: boolean;
}) {
  const spec = STRIP[kind];
  const tip = host ? `${spec.detail} ${host}` : spec.detail;

  if (compact) {
    return (
      <span
        className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{ background: spec.color, color: "var(--page)" }}
        role="status"
        title={tip}
      >
        {spec.compact}
      </span>
    );
  }

  return (
    <div
      className="rounded-[10px] px-4 py-3 text-[var(--page)]"
      style={{ background: spec.color }}
      role="status"
    >
      <p className="text-lg font-semibold tracking-wide">{spec.label}</p>
      <p className="mt-0.5 text-sm opacity-95">
        {spec.detail}
        {host ? (
          <>
            {" "}
            <span className="font-mono text-xs opacity-90">{host}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
