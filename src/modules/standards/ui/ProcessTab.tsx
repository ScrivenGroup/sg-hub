import Link from "next/link";

const LANES = [
  {
    n: "1",
    title: "Desk",
    sub: "wip/<leaf> · :3001+",
    say: "develop",
  },
  {
    n: "2",
    title: "Station",
    sub: "dev_main · :3000",
    say: "merge to station",
  },
  {
    n: "3",
    title: "Live lane",
    sub: "git main",
    say: "make it live",
  },
  {
    n: "4",
    title: "Shop window",
    sub: "Azure zip",
    say: "tag hub-* / v*",
  },
];

const WORDS = [
  { say: "develop / update / frame", does: "Edit on this chat’s desk. Preview on that desk’s port. No commit until you ask." },
  { say: "commit / save a snapshot", does: "Commit and push this desk’s branch. Does not merge to station. Does not change Azure." },
  { say: "merge to station", does: "Standalone ask. Merge the save-slot into dev_main. Never implied by commit." },
  { say: "make it live", does: "From station: fast-forward main to dev_main, then tag hub-* / v* (or Run workflow). Push of dev_main is not live." },
];

const CYCLE = [
  { stage: "Sketched", what: "Registry + route + featureless shell + changelog plan. No fake buttons." },
  { stage: "Building", what: "Real chrome and routes. Dummy data uses the same store types as production." },
  { stage: "Live", what: "Real capability. Changelog release with version number and datetime." },
];

const YARD = [
  { term: "Leaf / room", meaning: "One card on the hub. A folder inside this Next.js app — not its own repo." },
  { term: "Desk", meaning: "Git worktree sibling folder + unique localhost port." },
  { term: "Save-slot", meaning: "Branch wip/<leaf>." },
  { term: "Station", meaning: "dev_main. Merge here when a room is happy. Keep it clean. Port 3000." },
  { term: "Live lane", meaning: "main. Always most behind. Matches Azure after make it live." },
  { term: "Locker", meaning: "GitHub ScrivenGroup/sg-hub. Push and pull across devices." },
  { term: "Shop window", meaning: "Azure app-scrivengroup. Only when you say make it live." },
];

export function ProcessTab() {
  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-[var(--muted)]">
        A <strong className="font-medium text-[var(--ink)]">leaf</strong> is one
        card on the hub. Work happens on a{" "}
        <strong className="font-medium text-[var(--ink)]">desk</strong> (folder +
        port). Git has three lanes. Locked words live in{" "}
        <Link href="/s/dev-choices" className="underline underline-offset-2">
          Development choices
        </Link>{" "}
        and the board at{" "}
        <Link href="/d" className="underline underline-offset-2">
          Development
        </Link>
        . This page teaches the process; those pages stay the register and the
        global board. Drop live design notes on this leaf’s Drop tab — not here.
      </p>

      <section aria-labelledby="lanes-heading">
        <h2 id="lanes-heading" className="mb-3 text-lg font-semibold">
          Lanes
        </h2>
        <LaneStrip />
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LANES.map((lane) => (
            <li key={lane.n} className="sg-card">
              <p className="text-xs font-medium text-[var(--muted)]">
                {lane.n} · you say {lane.say}
              </p>
              <p className="mt-1 font-semibold">{lane.title}</p>
              <p className="font-mono text-xs text-[var(--muted)]">{lane.sub}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="words-heading">
        <h2 id="words-heading" className="mb-3 text-lg font-semibold">
          What you say
        </h2>
        <div className="overflow-x-auto sg-card !p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-2.5">You say</th>
                <th className="px-4 py-2.5">Agent does</th>
              </tr>
            </thead>
            <tbody>
              {WORDS.map((row) => (
                <tr key={row.say} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.say}</td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">{row.does}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="cycle-heading">
        <h2 id="cycle-heading" className="mb-3 text-lg font-semibold">
          Leaf cycle
        </h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {CYCLE.map((row, i) => (
            <li key={row.stage} className="sg-card">
              <p className="text-xs font-medium text-[var(--muted)]">
                Stage {i + 1}
              </p>
              <p className="mt-1 font-semibold">{row.stage}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{row.what}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Sketched stays a featureless shell. Do not skip the online plan just
          because a dummy exists on a laptop.
        </p>
      </section>

      <section aria-labelledby="yard-heading">
        <h2 id="yard-heading" className="mb-3 text-lg font-semibold">
          Yard words
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {YARD.map((row) => (
            <div key={row.term} className="sg-card">
              <dt className="font-semibold">{row.term}</dt>
              <dd className="mt-1 text-sm text-[var(--muted)]">{row.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="dont-heading">
        <h2 id="dont-heading" className="mb-3 text-lg font-semibold">
          Do not
        </h2>
        <ul className="sg-card list-disc space-y-1.5 pl-5 text-sm text-[var(--muted)]">
          <li>Zip the shop window from a wip desk. Publish only from merged station after make it live.</li>
          <li>Treat commit as merge to station, or push of dev_main as live.</li>
          <li>Start a second repo, Vite app, or MD3 kit for a hub room.</li>
          <li>Replace Development choices or the global Kanban board with this page.</li>
        </ul>
      </section>
    </div>
  );
}

function LaneStrip() {
  return (
    <div className="sg-card overflow-x-auto">
      <svg
        viewBox="0 0 760 88"
        className="h-auto w-full min-w-[36rem]"
        role="img"
        aria-labelledby="laneSvgTitle laneSvgDesc"
      >
        <title id="laneSvgTitle">Four publish lanes</title>
        <desc id="laneSvgDesc">
          Desk merges to station when you say merge to station. Station becomes
          the live git pointer and Azure zip when you say make it live.
        </desc>
        <defs>
          <marker
            id="sg-lane-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink)" />
          </marker>
        </defs>
        {[
          { x: 8, label: "Desk", sub: "wip / :3001+" },
          { x: 198, label: "Station", sub: "dev_main :3000" },
          { x: 388, label: "Live lane", sub: "git main" },
          { x: 578, label: "Shop window", sub: "Azure" },
        ].map((box) => (
          <g key={box.label}>
            <rect
              x={box.x}
              y="18"
              width="168"
              height="52"
              rx="10"
              fill="var(--surface)"
              stroke="var(--border)"
            />
            <text
              x={box.x + 84}
              y="40"
              textAnchor="middle"
              fill="var(--ink)"
              fontSize="13"
              fontWeight="600"
            >
              {box.label}
            </text>
            <text
              x={box.x + 84}
              y="58"
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="11"
            >
              {box.sub}
            </text>
          </g>
        ))}
        <line
          x1="176"
          y1="44"
          x2="198"
          y2="44"
          stroke="var(--ink)"
          strokeWidth="1.5"
          markerEnd="url(#sg-lane-arrow)"
        />
        <line
          x1="366"
          y1="44"
          x2="388"
          y2="44"
          stroke="var(--ink)"
          strokeWidth="1.5"
          markerEnd="url(#sg-lane-arrow)"
        />
        <line
          x1="556"
          y1="44"
          x2="578"
          y2="44"
          stroke="var(--ink)"
          strokeWidth="1.5"
          markerEnd="url(#sg-lane-arrow)"
        />
      </svg>
    </div>
  );
}
