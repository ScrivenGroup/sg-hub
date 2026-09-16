import { auth, isMrtGuest } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/core/shell/AppShell";
import { getHubs, getChildren } from "@/core/registry";
import { getDependencies } from "@/core/store/json-store";
import { systemHubRag } from "@/core/access/rag";
import { RagDot } from "@/core/ui/RagDot";
import { CodeBadge } from "@/core/ui/CodeBadge";

export default async function HomePage() {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");

  const hubs = getHubs();
  const deps = await getDependencies();
  const systemRag = systemHubRag(deps);

  return (
    <AppShell currentHref="/home">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Home</h1>
        <p className="mt-2 max-w-xl text-[var(--muted)]">
          Choose a Hub. Work and Projects hold spin-out capable products;
          Development is the suite; Internal holds leftover tools; System
          defines and maintains the site.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {hubs.map((hub) => {
          const childCount = getChildren(hub.id).length;
          const showRag = hub.id === "hub-system" ? systemRag : "none";
          return (
            <Link key={hub.id} href={hub.href} className="sg-card relative">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h2 className="text-xl font-semibold">{hub.title}</h2>
                <div className="flex items-center gap-2">
                  <RagDot level={showRag} size={12} />
                  <CodeBadge node={hub} />
                </div>
              </div>
              <p className="text-sm text-[var(--muted)]">{hub.description}</p>
              {childCount > 0 ? (
                <p className="mt-4 text-xs text-[var(--muted)]">
                  {childCount} area{childCount === 1 ? "" : "s"}
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
