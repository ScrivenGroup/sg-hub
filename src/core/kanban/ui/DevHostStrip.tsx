import type { DevHostKind } from "../host";

const STRIP: Record<
  DevHostKind,
  { label: string; detail: string; color: string }
> = {
  live: {
    label: "ON LIVE",
    detail: "This is the published Azure site. What you see is the live disk.",
    color: "var(--rag-green)",
  },
  localhost: {
    label: "VIA LOCALHOST",
    detail:
      "Laptop disk — not Azure. Changes here do not update live until you publish a snapshot on live (and zip-deploy does not copy data/).",
    color: "var(--rag-amber)",
  },
  other: {
    label: "UNKNOWN HOST",
    detail: "Not recognised as Azure live or localhost. Do not assume this is production.",
    color: "var(--rag-amber)",
  },
};

export function DevHostStrip({
  kind,
  host,
}: {
  kind: DevHostKind;
  host: string;
}) {
  const spec = STRIP[kind];
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
