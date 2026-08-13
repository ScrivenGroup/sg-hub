import { SubHubShell } from "@/core/shell/SubHubShell";
import { getIdeas } from "@/core/store/json-store";

export default async function IdeasPage() {
  const ideas = await getIdeas();
  return (
    <SubHubShell
      href="/i/ideas"
      extra={
        <section className="mb-8 space-y-3">
          <h2 className="text-lg font-semibold">Register</h2>
          {ideas.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No ideas yet.</p>
          ) : (
            <ul className="space-y-3">
              {ideas.map((idea) => (
                <li key={idea.id} className="sg-card">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{idea.title}</h3>
                    <span className="text-xs text-[var(--muted)]">
                      {idea.status}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">{idea.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      }
    />
  );
}
