import type { ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/core/shell/AppShell";
import { AppearanceTokens } from "@/core/shell/AppearanceTokens";
import { PageNav } from "@/core/shell/PageNav";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { StatusPill } from "@/core/ui/StatusPill";
import { getStandardsChoices, getStandardsHolds } from "@/core/store/json-store";
import { BehavioursTab } from "@/modules/standards/ui/BehavioursTab";
import { DesignLibraryTab } from "@/modules/standards/ui/DesignLibraryTab";
import { HomeTab } from "@/modules/standards/ui/HomeTab";
import { ProcessTab } from "@/modules/standards/ui/ProcessTab";

const HREF = "/s/library";

const TABS = [
  { id: "components", label: "Component library" },
  { id: "behaviours", label: "Web-app behaviours" },
  { id: "processes", label: "Processes" },
  { id: "appearance", label: "Appearance (expired)" },
  { id: "standards", label: "Standards (expired)" },
] as const;

type LibraryTab = (typeof TABS)[number]["id"] | "standards-design" | "standards-behaviours" | "standards-process";

function parseTab(raw?: string): LibraryTab {
  if (
    raw === "behaviours" ||
    raw === "processes" ||
    raw === "appearance" ||
    raw === "standards" ||
    raw === "standards-design" ||
    raw === "standards-behaviours" ||
    raw === "standards-process"
  ) {
    return raw;
  }
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
  const standardsFamily = tab === "standards" || tab.startsWith("standards-");
  const choices = standardsFamily ? await getStandardsChoices() : {};
  const holds = standardsFamily ? await getStandardsHolds() : [];

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
        {TABS.map((item) => {
          const selected =
            item.id === "standards" ? standardsFamily : tab === item.id;
          return (
            <Link
              key={item.id}
              href={item.id === "components" ? HREF : `${HREF}?tab=${item.id}`}
              role="tab"
              aria-selected={selected}
              className="sg-tab"
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      {tab === "components" ? (
        <LibraryBrief
          title="Component library"
          body="Default components for a ScrivenGroup page. The specimen HTML for this tab is still to come."
        />
      ) : null}
      {tab === "behaviours" ? (
        <LibraryBrief
          title="Web-app behaviours"
          body="How a page should behave: loading, navigation, forms, and the rest of the default interaction. The specimen for this tab is still to come."
        />
      ) : null}
      {tab === "processes" ? (
        <LibraryBrief
          title="Processes"
          body="How an agent and a person develop on this hub. The specimen for this tab is still to come. Locked choices stay on Development choices until that specimen lands."
        />
      ) : null}
      {tab === "appearance" ? (
        <ExpiredRollup title="Appearance (expired)">
          <AppearanceTokens />
        </ExpiredRollup>
      ) : null}
      {standardsFamily ? (
        <ExpiredRollup title="Standards (expired)">
          <div role="tablist" aria-label="Expired standards" className="mb-6 flex flex-wrap gap-1">
            <LibrarySubTab href={`${HREF}?tab=standards`} selected={tab === "standards"} label="Home" />
            <LibrarySubTab href={`${HREF}?tab=standards-design`} selected={tab === "standards-design"} label="Design Library" />
            <LibrarySubTab href={`${HREF}?tab=standards-behaviours`} selected={tab === "standards-behaviours"} label="Behaviours" />
            <LibrarySubTab href={`${HREF}?tab=standards-process`} selected={tab === "standards-process"} label="Process" />
          </div>
          {tab === "standards-design" ? <DesignLibraryTab choices={choices} /> : null}
          {tab === "standards-behaviours" ? <BehavioursTab /> : null}
          {tab === "standards-process" ? <ProcessTab /> : null}
          {tab === "standards" ? <HomeTab holds={holds} /> : null}
        </ExpiredRollup>
      ) : null}
    </AppShell>
  );
}

function LibrarySubTab({
  href,
  selected,
  label,
}: {
  href: string;
  selected: boolean;
  label: string;
}) {
  return (
    <Link href={href} role="tab" aria-selected={selected} className="sg-tab">
      {label}
    </Link>
  );
}

function LibraryBrief({ title, body }: { title: string; body: string }) {
  return (
    <article className="sg-card max-w-2xl">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
    </article>
  );
}

function ExpiredRollup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <p className="max-w-2xl text-sm text-[var(--muted)]">
        {title}. Kept here until the library replaces it. The old card stays on
        System, greyed, and is marked to delete.
      </p>
      {children}
    </section>
  );
}
