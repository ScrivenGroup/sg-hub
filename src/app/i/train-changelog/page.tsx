import { auth, isMrtGuest } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";
import { TRAIN_CHANGELOG_HREF, TRAIN_CHANGELOG_NODE_ID } from "@/core/train/version";
import { TrainChangelogPanel } from "@/core/train/TrainChangelogPanel";
import { getChangelogsForNode } from "@/core/store/json-store";

export const dynamic = "force-dynamic";

export default async function TrainChangelogPage() {
  const session = await auth();
  if (isMrtGuest(session)) redirect("/w/sunwater-mrt");
  const changelogs = await getChangelogsForNode(TRAIN_CHANGELOG_NODE_ID);
  const node = getNodeByHref(TRAIN_CHANGELOG_HREF);

  return (
    <AppShell
      currentHref={TRAIN_CHANGELOG_HREF}
      frameClassName="h-dvh max-h-dvh overflow-hidden"
      mainClassName="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 pb-3 pt-3"
    >
      <div className="shrink-0">
        <PageNav href={TRAIN_CHANGELOG_HREF} compact />
      </div>
      <header className="mb-1 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">
            {node?.title ?? "Train Changelog"}
          </h1>
          {node ? <CodeBadge node={node} /> : null}
        </div>
      </header>
      <TrainChangelogPanel changelogs={changelogs} />
    </AppShell>
  );
}
