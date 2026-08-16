import { AppShell } from "@/core/shell/AppShell";
import { PageNav } from "@/core/shell/PageNav";
import { FeedbackRegister } from "@/core/feedback/FeedbackRegister";
import { getFeedback } from "@/core/store/json-store";
import { getNodeByHref } from "@/core/registry";
import { CodeBadge } from "@/core/ui/CodeBadge";

export default async function FeedbackRegisterPage() {
  const items = await getFeedback();
  const node = getNodeByHref("/i/feedback");

  return (
    <AppShell currentHref="/i/feedback">
      <PageNav href="/i/feedback" />
      <header className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Feedback</h1>
          {node ? <CodeBadge node={node} /> : null}
        </div>
        <p className="max-w-xl text-[var(--muted)]">
          Global feedback register. Use the Feedback control on any page (header
          on desktop, floating button on mobile). Cursor sessions should read{" "}
          <code className="text-sm">docs/feedback-inbox.md</code> and this
          register for housekeeping / bug-fix prompts.
        </p>
      </header>

      <FeedbackRegister items={items} />
    </AppShell>
  );
}
