/**
 * One-shot: copy laptop data/kanban JSON into Neon.
 * Loads DATABASE_URL from .env.local. Never prints the URL.
 *
 * Run from this desk: npx --yes tsx scripts/migrate-local-kanban-to-neon.ts
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import {
  pgEnd,
  pgGetKanbanIdeas,
  pgGetKanbanTickets,
  pgInsertKanbanAttachment,
  pgUpsertKanbanIdea,
  pgUpsertKanbanMeta,
  pgUpsertKanbanTicket,
  postgresEnabled,
} from "../src/core/store/simple-pg";
import type { KanbanInboxNote, KanbanMeta, KanbanTicket } from "../src/core/kanban/schema";
import type { KanbanAttachmentStoreRow } from "../src/core/store/schema";

function loadDatabaseUrlFromEnvLocal(): boolean {
  const file = path.join(process.cwd(), ".env.local");
  if (!existsSync(file)) return false;
  const raw = readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (!trimmed.startsWith("DATABASE_URL=")) continue;
    const value = trimmed
      .slice("DATABASE_URL=".length)
      .replace(/^["']|["']$/g, "")
      .trim();
    if (value) {
      process.env.DATABASE_URL = value;
      return true;
    }
  }
  return false;
}

function readJsonArray<T>(rel: string): T[] {
  const full = path.join(process.cwd(), "data", rel);
  if (!existsSync(full)) return [];
  const raw = JSON.parse(readFileSync(full, "utf8"));
  return Array.isArray(raw) ? (raw as T[]) : [];
}

async function main() {
  if (!loadDatabaseUrlFromEnvLocal()) {
    console.log("No DATABASE_URL in .env.local — stop.");
    process.exit(1);
  }
  if (!postgresEnabled()) {
    console.log("postgresEnabled() is false after loading .env.local — stop.");
    process.exit(1);
  }

  const ideas = readJsonArray<KanbanInboxNote>(path.join("kanban", "ideas.json"));
  const tickets = readJsonArray<KanbanTicket>(path.join("kanban", "tickets.json"));
  const meta = readJsonArray<KanbanMeta>(path.join("kanban", "meta.json"));
  const attachments = readJsonArray<KanbanAttachmentStoreRow>(
    path.join("kanban", "attachments.json"),
  );

  const beforeIdeas = (await pgGetKanbanIdeas()).length;
  const beforeTickets = (await pgGetKanbanTickets()).length;

  for (const row of ideas) await pgUpsertKanbanIdea(row);
  for (const row of tickets) await pgUpsertKanbanTicket(row);
  for (const row of meta) await pgUpsertKanbanMeta(row);

  let attachmentsCopied = 0;
  for (const row of attachments) {
    const bin = path.join(process.cwd(), "data", "kanban", "attachments", `${row.id}.bin`);
    if (!existsSync(bin)) continue;
    try {
      await pgInsertKanbanAttachment(row, readFileSync(bin));
      attachmentsCopied += 1;
    } catch {
      attachmentsCopied += 0;
    }
  }

  const afterIdeas = (await pgGetKanbanIdeas()).length;
  const afterTickets = (await pgGetKanbanTickets()).length;
  console.log(
    `Neon kanban: ideas ${beforeIdeas} -> ${afterIdeas} (upserted ${ideas.length} from disk); tickets ${beforeTickets} -> ${afterTickets} (upserted ${tickets.length}); attachment files copied ${attachmentsCopied}.`,
  );
  await pgEnd();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await pgEnd().catch(() => undefined);
  process.exit(1);
});
