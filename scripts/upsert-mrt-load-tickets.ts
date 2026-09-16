/**
 * One-shot: seed the MRT load-time tickets onto Neon and archive fb-mtteyhko.
 * Does not call getKanbanBoard.
 * npx --yes tsx scripts/upsert-mrt-load-tickets.ts
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import {
  getKanbanIdeaById,
  upsertKanbanIdea,
  upsertKanbanTicket,
} from "../src/core/store/json-store";

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
  const createdAt = "2026-09-16T00:38:00.000Z";
  const updatedAt = new Date().toISOString();
  await upsertKanbanTicket({
    id: "kt-mrt-shell-first",
    nodeId: "w-sunwater-mrt",
    title: "MRT paints shell before plan data",
    body: `sourceIdeaId fb-mtteyhko. Spec in archived IN-20260908-03 and IN-20260909-01.

AppShell and MRT tabs render immediately. The workspace pane shows a loading line with qty (Loading plan… 1 of 2). MRT-local only — not the hub-wide spinner in fb-mtuwhdnu.`,
    lane: "experience",
    column: "open",
    sourceIdeaId: "fb-mtteyhko",
    createdAt,
    updatedAt,
  });
  await upsertKanbanTicket({
    id: "kt-mrt-defer-board",
    nodeId: "w-sunwater-mrt",
    title: "Do not block Gantt on the Kanban board",
    body: `sourceIdeaId fb-mtteyhko.

Gantt path loads plan + changelogs in parallel. getKanbanBoard runs only when Development is shown. Do not call getKanbanBoard for inbox forensics.`,
    lane: "behaviour",
    column: "open",
    sourceIdeaId: "fb-mtteyhko",
    createdAt,
    updatedAt,
  });
  const idea = await getKanbanIdeaById("fb-mtteyhko");
  if (idea && idea.status !== "archived") {
    await upsertKanbanIdea({
      ...idea,
      status: "archived",
      updatedAt,
      copiedAt: idea.copiedAt ?? updatedAt,
    });
    console.log("archived fb-mtteyhko");
  } else if (!idea) {
    console.log("fb-mtteyhko missing");
  } else {
    console.log("fb-mtteyhko already archived");
  }
  console.log("upserted kt-mrt-shell-first kt-mrt-defer-board");
  process.exit(0);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : "upsert-failed";
  console.error(message.replace(/postgres(ql)?:\/\/[^\s]+/gi, "[redacted]"));
  process.exit(1);
});
