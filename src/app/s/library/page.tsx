import Link from "next/link";
import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";

const HREF = "/s/library";

const TABS = [
  { id: "components", label: "Component library" },
  { id: "behaviours", label: "Web-app behaviours" },
  { id: "processes", label: "Processes" },
] as const;

type LibraryTab = (typeof TABS)[number]["id"];

function parseTab(raw?: string): LibraryTab {
  if (raw === "behaviours" || raw === "processes") return raw;
  return "components";
}

export default async function StandardsLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const node = getNodeByHref(HREF);

  return (
    <AppShell currentHref={HREF}>
      <PageNav href={HREF} />
      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Standards Library</h1>
          {node ? <CodeBadge node={node} /> : null}
          {node ? <StatusPill status={node.status} /> : null}
        </div>
        <p className="max-w-2xl text-[var(--muted)]">
          One-stop source of truth for default development. Point a new agent
          here before it builds.
        </p>
      </header>
      <div role="tablist" aria-label="Standards Library" className="mb-6 flex flex-wrap gap-1">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={item.id === "components" ? HREF : `${HREF}?tab=${item.id}`}
            role="tab"
            aria-selected={tab === item.id}
            className="sg-tab"
          >
            {item.label}
          </Link>
        ))}
      </div>
      <LibrarySpecimenFrame
        view={tab}
        title={
          tab === "behaviours"
            ? "Web-app behaviours specimen"
            : tab === "processes"
              ? "Processes specimen"
              : "Component library specimen"
        }
      />
    </AppShell>
  );
}

function LibrarySpecimenFrame({
  view,
  title,
}: {
  view: "components" | "behaviours" | "processes";
  title: string;
}) {
  return (
    <iframe
      title={title}
      src={`/standards-library.html?embed=1&view=${view}`}
      className="h-[calc(100dvh-13rem)] min-h-[32rem] w-full rounded-[10px] border border-[var(--border)] bg-white"
    />
  );
}
