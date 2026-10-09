import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { DevChoicesRegister } from "@/core/dev-choices/DevChoicesRegister";
import { getDevChoices } from "@/core/store/json-store";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";

const HREF = "/s/dev-choices";

export default async function DevChoicesPage() {
  const items = await getDevChoices();
  const node = getNodeByHref(HREF);

  return (
    <AppShell currentHref={HREF}>
      <PageNav href={HREF} />
      <header className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Development choices
          </h1>
          {node ? <CodeBadge node={node} /> : null}
        </div>
        <p className="max-w-xl text-[var(--muted)]">
          Locked development standards shared by humans and Cursor chats. Later
          sessions should read{" "}
          <code className="text-sm">docs/DEV_CHOICES.md</code> and this register;
          do not contradict locked rows.
        </p>
      </header>

      <DevChoicesRegister items={items} />
    </AppShell>
  );
}
