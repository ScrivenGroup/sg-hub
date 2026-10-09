import Link from "next/link";
import { ROADMAP_HREF } from "@/core/roadmap/tabs";

/** Header door to Roadmap. Sits beside the Train version. */
export function RoadmapMapLink() {
  return (
    <Link
      href={ROADMAP_HREF}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)]"
      title="Roadmap"
      aria-label="Roadmap"
    >
      <RoadmapMapIcon />
    </Link>
  );
}

function RoadmapMapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden>
      <rect x="4" y="4" width="56" height="56" rx="8" fill="#d7b56a" stroke="#6b4e2e" strokeWidth="3" />
      <rect x="9" y="9" width="46" height="46" rx="4" fill="#e7cb8a" />
      <path
        d="M16 44c6-2 8-10 14-10s6 8 12 6 8-12 10-14"
        fill="none"
        stroke="#8a6234"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="40" cy="24" r="5" fill="#c23b2e" stroke="#7a1e16" strokeWidth="1.5" />
      <circle cx="48" cy="46" r="7" fill="none" stroke="#5c4630" strokeWidth="1.6" />
      <path d="M48 40.5v11M42.5 46h11" stroke="#5c4630" strokeWidth="1.4" />
    </svg>
  );
}
