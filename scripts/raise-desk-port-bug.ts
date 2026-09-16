/**
 * Raise Global bug IN-20260916-01 — WIP desk port / AUTH_URL.
 * npx --yes tsx scripts/raise-desk-port-bug.ts
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { upsertKanbanIdea } from "../src/core/store/json-store";

function loadDatabaseUrlFromEnvLocal(): void {
  const file = path.join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (!trimmed.startsWith("DATABASE_URL=")) continue;
    const value = trimmed
      .slice("DATABASE_URL=".length)
      .replace(/^["']|["']$/g, "")
      .trim();
    if (value) process.env.DATABASE_URL = value;
    return;
  }
}

async function main() {
  loadDatabaseUrlFromEnvLocal();
  if (!process.env.DATABASE_URL) {
    console.log("skip: no DATABASE_URL");
    process.exit(1);
  }
  const now = new Date().toISOString();
  await upsertKanbanIdea({
    id: "IN-20260916-01",
    nodeId: "global",
    title: "WIP desk preview must stay on that desk’s port",
    body: `Bug. Agents copy station .env.local (AUTH_URL=http://localhost:3000) onto a wip desk, run next on :3001, then type “localhost:3001” while login, callbacks, and clickable preview dump the user on :3000 (station).

Yard protocol: station scrivengroup / dev_main = :3000. Each wip/<leaf> desk = its own port (:3001, :3002, …). AUTH_URL on that desk must match the port next dev uses. Never paste a :3000 preview from a wip chat.

Update the brain so this cannot happen again: YARD_DESKS, publish-yard rule, GIT_AND_RELEASE desks line, .env.example, kanban session prompt Host, hub-web-dev, checklist item 8. Split remaining docs (technical.md, hub-decisions-pack, README) if they still say “open localhost:3000” as the only preview.`,
    status: "open",
    kind: "bug",
    source: "raise",
    pageHref: "/w/sunwater-mrt",
    pageTitle: "Sunwater - Milestone Resourcing Tracker",
    submittedBy: "Scriven Owner",
    createdAt: now,
    updatedAt: now,
    copiedAt: null,
  });
  console.log("raised IN-20260916-01 global bug");
  process.exit(0);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : "raise-failed";
  console.error(message.replace(/postgres(ql)?:\/\/[^\s]+/gi, "[redacted]"));
  process.exit(1);
});
