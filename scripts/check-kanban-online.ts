/**
 * Local check for Kanban Online rows (JSON fallback + zip exclude).
 * Never prints DATABASE_URL. Run from repo root: npx --yes tsx scripts/check-kanban-online.ts
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { stripDeployDataDir } from "./strip-deploy-data.mjs";
import {
  getKanbanAllBoard,
  getKanbanBoard,
  getKanbanIdeaById,
  upsertKanbanIdea,
} from "../src/core/store/json-store";
import { postgresEnabled } from "../src/core/store/simple-pg";
import { KANBAN_GLOBAL_NODE_ID } from "../src/core/kanban/schema";

const MARKER = "ticket-2026-09-05-sg-kanban-online-check";

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

async function checkZipExclude(): Promise<void> {
  const tmp = path.join(process.cwd(), ".tmp-check-deploy");
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(path.join(tmp, "data", "kanban"), { recursive: true });
  writeFileSync(path.join(tmp, "data", "kanban", "ideas.json"), "[]", "utf8");
  const removed = stripDeployDataDir(tmp);
  const stillThere = existsSync(path.join(tmp, "data"));
  rmSync(tmp, { recursive: true, force: true });
  if (!removed || stillThere) {
    throw new Error("stripDeployDataDir did not remove data/");
  }
  console.log("zip-exclude: stripDeployDataDir removes data/ — ok");
}

async function removeCheckIdea(id: string) {
  const file = path.join(process.cwd(), "data", "kanban", "ideas.json");
  if (!existsSync(file)) return;
  const rows = JSON.parse(readFileSync(file, "utf8")) as Array<{ id: string }>;
  writeFileSync(
    file,
    JSON.stringify(
      rows.filter((row) => row.id !== id),
      null,
      2,
    ),
    "utf8",
  );
}

async function checkJsonFallback(): Promise<void> {
  delete process.env.DATABASE_URL;
  if (postgresEnabled()) {
    throw new Error("postgresEnabled() true after unsetting DATABASE_URL");
  }
  const now = new Date().toISOString();
  const id = `IN-CHECK-${Date.now()}`;
  await upsertKanbanIdea({
    id,
    nodeId: "p-mtg-buylist",
    title: MARKER,
    body: "json fallback row",
    status: "open",
    createdAt: now,
    updatedAt: now,
    copiedAt: null,
  });
  const file = path.join(process.cwd(), "data", "kanban", "ideas.json");
  const raw = readFileSync(file, "utf8");
  const rows = JSON.parse(raw) as Array<{ id: string; nodeId: string; title: string }>;
  const found = rows.find((row) => row.id === id && row.nodeId === "p-mtg-buylist");
  if (!found) throw new Error("JSON fallback: ideas.json missing nodeId row");
  await upsertKanbanIdea({
    ...found,
    title: found.title,
    body: "retagged",
    nodeId: KANBAN_GLOBAL_NODE_ID,
    status: "open",
    createdAt: now,
    updatedAt: now,
    copiedAt: null,
    id,
  });
  const leaf = await getKanbanBoard("p-mtg-buylist");
  const all = await getKanbanAllBoard();
  const after = await getKanbanIdeaById(id);
  if (leaf.ideas.some((row) => row.id === id)) {
    throw new Error("Retag: idea still on leaf board");
  }
  if (!all.ideas.some((row) => row.id === id && row.nodeId === KANBAN_GLOBAL_NODE_ID)) {
    throw new Error("Retag: idea missing from all-board Global");
  }
  if (after?.nodeId !== KANBAN_GLOBAL_NODE_ID) {
    throw new Error("Retag: nodeId was not an UPDATE on the same row");
  }
  await removeCheckIdea(id);
  console.log("json-fallback: kanban ideas.json rows + retag UPDATE — ok");
}

async function checkPostgres(): Promise<void> {
  const loaded = loadDatabaseUrlFromEnvLocal();
  if (!loaded) {
    console.log("postgres: needs local .env — not pasted");
    return;
  }
  if (!postgresEnabled()) {
    throw new Error("DATABASE_URL present in .env.local but postgresEnabled() is false");
  }
  const now = new Date().toISOString();
  const id = `IN-CHECK-PG-${Date.now()}`;
  await upsertKanbanIdea({
    id,
    nodeId: "p-mtg-buylist",
    title: MARKER + "-pg",
    body: "postgres row",
    status: "open",
    createdAt: now,
    updatedAt: now,
    copiedAt: null,
  });
  const found = await getKanbanIdeaById(id);
  if (!found || found.nodeId !== "p-mtg-buylist") {
    throw new Error("Postgres: kanban idea not returned");
  }
  await upsertKanbanIdea({
    ...found,
    nodeId: KANBAN_GLOBAL_NODE_ID,
    updatedAt: new Date().toISOString(),
  });
  const retagged = await getKanbanIdeaById(id);
  if (retagged?.nodeId !== KANBAN_GLOBAL_NODE_ID) {
    throw new Error("Postgres: retag did not UPDATE node_id");
  }
  const { pgDeleteKanbanIdea } = await import("../src/core/store/simple-pg");
  await pgDeleteKanbanIdea(id);
  console.log("postgres: kanban idea hit Postgres — ok (row deleted)");
}

async function main() {
  await checkZipExclude();
  await checkJsonFallback();
  await checkPostgres();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
