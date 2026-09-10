/**
 * Sitting inspect: read-only SELECT on Neon feedback + kanban_ideas (+ ticket ids).
 * Optional Kudu GET of wwwroot JSON. Never prints DATABASE_URL.
 * Does not call getKanbanBoard / loadKanbanRows (those can seed-write).
 *
 * Run from repo root: npx --yes tsx scripts/inspect-neon-inbox.ts
 */
import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import postgres from "postgres";

const APP = "app-scrivengroup";
const RG = "rg-scrivengroup";
const DAY = "2026-09-09";
const NODE_IDS = ["global", "w-sunwater-mrt"] as const;
const NEEDLES = [
  "load",
  "merge feedback",
  "sunwater",
  "mrt",
  "notes survive",
  "survive publish",
];

type UrlSource = "env-local" | "azure";

type FeedbackRow = {
  id: string;
  created_at: string;
  kind: string;
  status: string;
  page_href: string;
  page_title: string;
  message: string;
  submitted_by: string;
};

type IdeaRow = {
  id: string;
  node_id: string;
  title: string;
  body: string;
  status: string;
  kind?: string;
  source?: string;
  created_at: string;
  updated_at: string;
};

type TicketRow = {
  id: string;
  node_id: string;
  title: string;
  column: string;
  source_idea_id: string | null;
  created_at: string;
};

function redact(text: string): string {
  return text
    .replace(/postgres(ql)?:\/\/[^\s]+/gi, "[redacted]")
    .replace(/DATABASE_URL[^\s]*/gi, "[redacted]");
}

function firstLine(text: string, max = 160): string {
  const line = (text || "").split(/\r?\n/)[0]?.trim() || "";
  return line.length > max ? `${line.slice(0, max)}…` : line;
}

function needleHit(text: string): boolean {
  const lower = text.toLowerCase();
  return NEEDLES.some((n) => lower.includes(n.toLowerCase()));
}

function loadDatabaseUrlFromEnvLocal(): string {
  const file = path.join(process.cwd(), ".env.local");
  if (!existsSync(file)) return "";
  const raw = readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (!trimmed.startsWith("DATABASE_URL=")) continue;
    const value = trimmed
      .slice("DATABASE_URL=".length)
      .replace(/^["']|["']$/g, "")
      .trim();
    if (value) return value;
  }
  return "";
}

function az(args: string[]): { ok: boolean; stdout: string } {
  const result = spawnSync("az", args, {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
    shell: process.platform === "win32",
  });
  return {
    ok: result.status === 0 && !result.error,
    stdout: result.stdout ?? "",
  };
}

function loadDatabaseUrlFromAzure(): string {
  const result = az([
    "webapp",
    "config",
    "appsettings",
    "list",
    "--name",
    APP,
    "--resource-group",
    RG,
    "-o",
    "json",
  ]);
  if (!result.ok) return "";
  try {
    const rows = JSON.parse(result.stdout) as Array<{ name?: string; value?: string }>;
    const row = rows.find((item) => item.name === "DATABASE_URL");
    return (row?.value ?? "").trim();
  } catch {
    return "";
  }
}

function azureDatabaseUrlNamePresent(): boolean {
  const result = az([
    "webapp",
    "config",
    "appsettings",
    "list",
    "--name",
    APP,
    "--resource-group",
    RG,
    "--query",
    "[].name",
    "-o",
    "json",
  ]);
  if (!result.ok) return false;
  try {
    const names = JSON.parse(result.stdout) as unknown;
    return Array.isArray(names) && names.includes("DATABASE_URL");
  } catch {
    return false;
  }
}

function logFeedback(row: FeedbackRow, tag: string) {
  console.log(
    `feedback ${tag} id=${row.id} kind=${row.kind} status=${row.status} at=${row.created_at} href=${row.page_href} title=${JSON.stringify(firstLine(row.page_title))} msg=${JSON.stringify(firstLine(row.message))}`,
  );
}

function logIdea(row: IdeaRow, tag: string) {
  console.log(
    `idea ${tag} id=${row.id} node=${row.node_id} kind=${row.kind || "idea"} source=${row.source || "raise"} status=${row.status} at=${row.created_at} title=${JSON.stringify(firstLine(row.title))} body=${JSON.stringify(firstLine(row.body))}`,
  );
}

function logTicket(row: TicketRow, tag: string) {
  console.log(
    `ticket ${tag} id=${row.id} node=${row.node_id} column=${row.column} source=${row.source_idea_id ?? "none"} at=${row.created_at} title=${JSON.stringify(firstLine(row.title))}`,
  );
}

async function inspectSql(url: string, source: UrlSource): Promise<void> {
  console.log(`url-source=${source}`);
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const ideaCounts = await sql<
      { node_id: string; n: string }[]
    >`select node_id, count(*)::text as n from kanban_ideas group by node_id order by node_id`;
    const ticketCounts = await sql<
      { node_id: string; n: string }[]
    >`select node_id, count(*)::text as n from kanban_tickets group by node_id order by node_id`;
    const feedbackCount = await sql<{ n: string }[]>`select count(*)::text as n from feedback`;
    console.log(`counts source=${source} feedback=${feedbackCount[0]?.n ?? "0"}`);
    for (const row of ideaCounts) {
      console.log(`counts source=${source} kanban_ideas node=${row.node_id} n=${row.n}`);
    }
    if (ideaCounts.length === 0) console.log(`counts source=${source} kanban_ideas n=0`);
    for (const row of ticketCounts) {
      console.log(`counts source=${source} kanban_tickets node=${row.node_id} n=${row.n}`);
    }
    if (ticketCounts.length === 0) console.log(`counts source=${source} kanban_tickets n=0`);

    const feedbackDay = await sql<FeedbackRow[]>`
      select id, created_at, kind, status, page_href, page_title, message, submitted_by
      from feedback
      where created_at >= ${`${DAY}T00:00:00.000Z`} and created_at < ${`${DAY}T23:59:59.999Z`}
         or created_at like ${`${DAY}%`}
      order by created_at
    `;
    const feedbackNeedle = await sql<FeedbackRow[]>`
      select id, created_at, kind, status, page_href, page_title, message, submitted_by
      from feedback
      where message ilike ${"%load%"}
         or message ilike ${"%merge feedback%"}
         or message ilike ${"%sunwater%"}
         or message ilike ${"%mrt%"}
         or page_href ilike ${"%sunwater%"}
         or page_href ilike ${"%mrt%"}
         or page_title ilike ${"%sunwater%"}
         or page_title ilike ${"%mrt%"}
         or page_title ilike ${"%load%"}
         or page_title ilike ${"%merge feedback%"}
      order by created_at
    `;

    const ideasDay = await sql<IdeaRow[]>`
      select id, node_id, title, body, status, kind, source, created_at, updated_at
      from kanban_ideas
      where created_at like ${`${DAY}%`}
      order by created_at
    `;
    const ideasNode = await sql<IdeaRow[]>`
      select id, node_id, title, body, status, kind, source, created_at, updated_at
      from kanban_ideas
      where node_id in ${sql(NODE_IDS)}
      order by created_at
    `;
    const ideasNeedle = await sql<IdeaRow[]>`
      select id, node_id, title, body, status, kind, source, created_at, updated_at
      from kanban_ideas
      where title ilike ${"%load%"}
         or body ilike ${"%load%"}
         or title ilike ${"%merge feedback%"}
         or body ilike ${"%merge feedback%"}
         or title ilike ${"%sunwater%"}
         or body ilike ${"%sunwater%"}
         or title ilike ${"%mrt%"}
         or body ilike ${"%mrt%"}
         or title ilike ${"%survive%"}
         or body ilike ${"%survive%"}
         or kind in ('bug', 'housekeeping', 'other')
      order by created_at
    `;

    const ticketsNeedle = await sql<TicketRow[]>`
      select id, node_id, title, "column", source_idea_id, created_at
      from kanban_tickets
      where title ilike ${"%survive%"}
         or body ilike ${"%survive%"}
         or id ilike ${"%notes-survive%"}
         or id ilike ${"%db-make-live%"}
         or title ilike ${"%load%"}
         or body ilike ${"%merge feedback%"}
      order by created_at
    `;

    const seenFb = new Set<string>();
    console.log(`match source=${source} feedback day=${feedbackDay.length} needle=${feedbackNeedle.length}`);
    for (const row of [...feedbackDay, ...feedbackNeedle]) {
      if (seenFb.has(row.id)) continue;
      seenFb.add(row.id);
      const tag = row.created_at.startsWith(DAY) ? "day" : "needle";
      logFeedback(row, tag);
    }
    if (seenFb.size === 0) console.log(`match source=${source} feedback none`);

    const seenIdea = new Set<string>();
    console.log(
      `match source=${source} ideas day=${ideasDay.length} node=${ideasNode.length} needle=${ideasNeedle.length}`,
    );
    for (const row of [...ideasDay, ...ideasNeedle]) {
      if (seenIdea.has(row.id)) continue;
      seenIdea.add(row.id);
      const tag = row.created_at.startsWith(DAY)
        ? "day"
        : needleHit(`${row.title}\n${row.body}`)
          ? "needle"
          : "other";
      logIdea(row, tag);
    }
    const nodeOpen = ideasNode.filter((r) => r.status === "open");
    console.log(
      `match source=${source} ideas open-on-global-or-mrt=${nodeOpen.length} (seed empty-MRT is not proof of empty inbox)`,
    );
    for (const row of nodeOpen) {
      if (seenIdea.has(row.id)) continue;
      if (!row.created_at.startsWith(DAY) && !needleHit(`${row.title}\n${row.body}`)) continue;
      seenIdea.add(row.id);
      logIdea(row, "node");
    }
    if (seenIdea.size === 0) console.log(`match source=${source} ideas none`);

    console.log(`match source=${source} tickets needle=${ticketsNeedle.length}`);
    for (const row of ticketsNeedle) logTicket(row, "needle");
    if (ticketsNeedle.length === 0) console.log(`match source=${source} tickets none`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "select-failed";
    console.log(`select-error source=${source} ${redact(message).slice(0, 200)}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function inspectKuduJson(rel: string, dest: string): void {
  if (!existsSync(dest)) {
    console.log(`kudu-parse ${rel} missing`);
    return;
  }
  const raw = readFileSync(dest, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.log(`kudu-parse ${rel} invalid-json bytes=${raw.length}`);
    return;
  }
  if (rel.endsWith("feedback.json") && Array.isArray(parsed)) {
    const rows = parsed as FeedbackRow[];
    console.log(`kudu-parse ${rel} n=${rows.length}`);
    for (const row of rows) {
      const at = row.created_at || "";
      const blob = `${row.message || ""} ${row.page_title || ""} ${row.page_href || ""}`;
      if (at.startsWith(DAY) || needleHit(blob)) {
        logFeedback(row, "kudu");
      }
    }
    return;
  }
  if (rel.endsWith("ideas.json") && Array.isArray(parsed)) {
    const rows = parsed as IdeaRow[];
    console.log(`kudu-parse ${rel} n=${rows.length}`);
    const byNode = new Map<string, number>();
    for (const row of rows) {
      byNode.set(row.node_id, (byNode.get(row.node_id) ?? 0) + 1);
    }
    for (const [node, n] of [...byNode.entries()].sort()) {
      console.log(`kudu-parse ${rel} node=${node} n=${n}`);
    }
    for (const row of rows) {
      const at = row.created_at || "";
      const blob = `${row.title || ""}\n${row.body || ""}`;
      if (at.startsWith(DAY) || needleHit(blob) || NODE_IDS.includes(row.node_id as (typeof NODE_IDS)[number])) {
        if (at.startsWith(DAY) || needleHit(blob)) logIdea(row, "kudu");
      }
    }
    return;
  }
  console.log(`kudu-parse ${rel} unexpected-shape`);
}

async function fetchKudu(relPath: string, dest: string): Promise<void> {
  mkdirSync(path.dirname(dest), { recursive: true });
  const ps1 = path.join(process.cwd(), "scripts", "fetch-kudu-file.ps1");
  const ps = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1, "-RelPath", relPath, "-Dest", dest],
    { encoding: "utf8", timeout: 180_000, windowsHide: true },
  );
  const out = `${ps.stdout || ""}\n${ps.stderr || ""}`;
  for (const line of out.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) console.log(`kudu: ${redact(trimmed)}`);
  }
  if (ps.status === 0 && existsSync(dest)) {
    inspectKuduJson(relPath, dest);
    return;
  }
  console.log(`kudu: ${relPath} not-fetched status=${ps.status ?? "null"}`);
}

async function main() {
  const envUrl = loadDatabaseUrlFromEnvLocal();
  const azureName = azureDatabaseUrlNamePresent();
  console.log(`azure-appsetting-DATABASE_URL-name: ${azureName ? "present" : "MISSING"}`);
  const azureUrl = azureName ? loadDatabaseUrlFromAzure() : "";
  console.log(`azure-url-loaded: ${azureUrl ? "yes" : "no"}`);
  if (envUrl && azureUrl) {
    console.log(`azure-matches-env-local: ${envUrl === azureUrl ? "true" : "false"}`);
  }

  if (envUrl) {
    process.env.DATABASE_URL = envUrl;
    await inspectSql(envUrl, "env-local");
  } else {
    console.log("url-source=env-local missing");
  }

  if (azureUrl && azureUrl !== envUrl) {
    process.env.DATABASE_URL = azureUrl;
    await inspectSql(azureUrl, "azure");
  } else if (azureUrl) {
    console.log("url-source=azure skipped (same as env-local)");
  }

  const destDir = path.join(process.cwd(), ".tmp", "kudu-inspect");
  await fetchKudu("data/feedback.json", path.join(destDir, "feedback.json"));
  await fetchKudu("data/kanban/ideas.json", path.join(destDir, "ideas.json"));
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : "inspect-failed";
  console.error(redact(message));
  process.exit(1);
});
