import Link from "next/link";
import { STANDARDS_HREF } from "../schema";

export function StandardsNav({ mode }: { mode: "process" | "development" }) {
  return (
    <div role="tablist" aria-label="Standards" className="flex flex-wrap gap-1">
      <Link
        href={STANDARDS_HREF}
        role="tab"
        aria-selected={mode === "process"}
        className="sg-tab"
      >
        Process
      </Link>
      <Link
        href={`${STANDARDS_HREF}?tab=inbox`}
        role="tab"
        aria-selected={mode === "development"}
        className="sg-tab"
      >
        Development
      </Link>
    </div>
  );
}
