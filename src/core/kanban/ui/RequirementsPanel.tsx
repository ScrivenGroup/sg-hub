export function RequirementsPanel({
  leafTitle,
  body,
}: {
  leafTitle: string;
  body?: string;
}) {
  return (
    <article className="sg-card max-w-2xl overflow-y-auto text-sm leading-relaxed">
      <h2 className="text-lg font-semibold">{leafTitle}</h2>
      <p className="mt-2 text-[var(--muted)]">
        High-level requirements for this leaf. A person can read them. An agent
        uses them as the guideline before building.
      </p>
      {body?.trim() ? (
        <div className="sg-prose mt-4 whitespace-pre-wrap text-[var(--ink)]">{body}</div>
      ) : (
        <p className="mt-4">
          Not written yet. Say what this leaf is for, what it must do, and what
          it must not do.
        </p>
      )}
    </article>
  );
}
