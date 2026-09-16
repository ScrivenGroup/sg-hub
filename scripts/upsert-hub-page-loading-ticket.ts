/**
 * Neon-only ticket. Does not write data/kanban JSON.
 * npx --yes tsx scripts/upsert-hub-page-loading-ticket.ts
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { pgUpsertKanbanTicket } from "../src/core/store/simple-pg";

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
  await pgUpsertKanbanTicket({
    id: "kt-hub-page-loading",
    nodeId: "global",
    title: "Add loading indicators to all pages in ScrivenGroup Hub",
    body: `Every hub page should show loading feedback as soon as the user clicks (Home cards, Work/Projects webapp cards, Site network, leaf routes). MRT 1.5.2 covers the Work card + /w/sunwater-mrt shell only.

Reuse one chrome pattern (PendingNavLink + a route loading.tsx), not a one-off spinner per leaf. sourceIdeaId fb-mtuwhdnu.`,
    lane: "experience",
    column: "later",
    sourceIdeaId: "fb-mtuwhdnu",
    createdAt: now,
    updatedAt: now,
  });
  console.log("neon-only upserted kt-hub-page-loading");
  process.exit(0);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : "upsert-failed";
  console.error(message.replace(/postgres(ql)?:\/\/[^\s]+/gi, "[redacted]"));
  process.exit(1);
});
