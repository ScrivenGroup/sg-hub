export function RoadmapRequirements() {
  return (
    <article className="sg-card max-w-2xl overflow-y-auto text-sm leading-relaxed">
      <h2 className="text-lg font-semibold">Roadmap</h2>
      <p className="mt-2 text-[var(--muted)]">
        One glass for what we are building now, and what comes next.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>
          Show current and future work as chunks: a function, a feature, or a big idea.
        </li>
        <li>
          A chunk summarises ideas people have captured. It is not a second copy of each idea.
        </li>
        <li>
          Priority lives on the roadmap, from where a chunk sits. The inbox does not decide what gets built.
        </li>
        <li>
          This leaf is the source of truth. Each desk uses it, updates it, and checks it before starting work, so two desks do not build the same thing or work against each other.
        </li>
      </ul>
      <h3 className="mb-2 mt-6 text-sm font-semibold">Guardrails</h3>
      <ul className="list-disc space-y-2 pl-5">
        <li>v1 is the canvas on this page. It stays in memory until Neon. Do not invent a second store.</li>
        <li>v2 is a placeholder. Do not build another view in this version.</li>
        <li>
          Do not link a chunk to a ticket, an idea, or a changelog row until that Later ticket. Do not fake the link.
        </li>
        <li>
          Stream kind, regions, ties, dates, a feature manager, and auto-complete from Kanban stay Later.
        </li>
        <li>
          A per-leaf Roadmap, when it exists, uses the single-stream layout. Do not add it in this version.
        </li>
      </ul>
    </article>
  );
}
