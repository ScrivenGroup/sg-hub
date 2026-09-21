/**
 * Wave 0 Neon hygiene. Upserts seed Global rows + archives __offline__ duplicates.
 * Does not print DATABASE_URL. npx --yes tsx scripts/hub-wave0-neon.ts
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { applyKanbanHygiene, missingKanbanSeed } from "../src/core/kanban/seed";
import { seedChangelogs, seedDevChoices } from "../src/core/registry/seed";
import {
  pgGetKanbanIdeas,
  pgGetKanbanTickets,
  pgReplaceChangelogs,
  pgReplaceDevChoices,
  pgUpsertKanbanIdea,
  pgUpsertKanbanTicket,
} from "../src/core/store/simple-pg";
import type { KanbanTicket } from "../src/core/kanban/schema";
import { SG_HUB_CHANGELOG_NODE_IDS } from "../src/core/kanban/development-hub";
import { TRAIN_CHANGELOG_NODE_ID } from "../src/core/train/version";

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

function redact(text: string): string {
  return text.replace(/postgres(ql)?:\/\/[^\s]+/gi, "[redacted]");
}

async function main() {
  loadDatabaseUrlFromEnvLocal();
  if (!process.env.DATABASE_URL) {
    console.log("skip: no DATABASE_URL");
    process.exit(1);
  }

  const ideas = await pgGetKanbanIdeas();
  const tickets = await pgGetKanbanTickets();
  const missing = missingKanbanSeed({
    ideaIds: new Set(ideas.map((row) => row.id)),
    ticketIds: new Set(tickets.map((row) => row.id)),
  });

  const hygieneBundle = {
    ideas: ideas.map((row) => ({ ...row })),
    tickets: tickets.map((row) => ({ ...row })),
  };
  const hygieneChanged = applyKanbanHygiene(hygieneBundle);

  let ideaWrites = 0;
  let ticketWrites = 0;

  for (const row of missing.ideas) {
    await pgUpsertKanbanIdea(row);
    ideaWrites += 1;
  }
  for (const row of missing.tickets) {
    await pgUpsertKanbanTicket(row);
    ticketWrites += 1;
  }

  if (hygieneChanged) {
    const beforeIdeas = new Map(ideas.map((row) => [row.id, row]));
    const beforeTickets = new Map(tickets.map((row) => [row.id, row]));
    for (const row of hygieneBundle.ideas) {
      const prev = beforeIdeas.get(row.id);
      if (!prev || prev.status !== row.status) {
        await pgUpsertKanbanIdea(row);
        ideaWrites += 1;
      }
    }
    for (const row of hygieneBundle.tickets) {
      const prev = beforeTickets.get(row.id);
      if (!prev || prev.column !== row.column || prev.body !== row.body) {
        await pgUpsertKanbanTicket(row);
        ticketWrites += 1;
      }
    }
  }

  const now = new Date().toISOString();
  let archivedDupes = 0;
  for (const row of tickets) {
    if (!row.id.includes("__offline__")) continue;
    const next: KanbanTicket = {
      ...row,
      column: "archived",
      updatedAt: now,
      body: `${row.body}\n\nArchived 2026-09-21: laptop JSON duplicate of the real id.`,
    };
    await pgUpsertKanbanTicket(next);
    archivedDupes += 1;
  }

  const changelogNodeIds = new Set<string>([
    ...SG_HUB_CHANGELOG_NODE_IDS,
    TRAIN_CHANGELOG_NODE_ID,
  ]);
  const suiteChangelogs = seedChangelogs.filter((row) =>
    changelogNodeIds.has(row.nodeId),
  );
  await pgReplaceChangelogs(suiteChangelogs);
  await pgReplaceDevChoices(seedDevChoices);

  console.log(
    `wave0 neon ideas=${ideaWrites} tickets=${ticketWrites} offline-archived=${archivedDupes} changelogs=${suiteChangelogs.length} choices=${seedDevChoices.length}`,
  );
  process.exit(0);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : "wave0-failed";
  console.error(redact(message));
  process.exit(1);
});
