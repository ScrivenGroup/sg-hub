/**
 * Local check for Neon Phase 1 simple stores.
 * Never prints DATABASE_URL. Run from repo root: npx --yes tsx scripts/check-simple-stores.ts
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { stripDeployDataDir } from "./strip-deploy-data.mjs";
import { addFeedback, getFeedback } from "../src/core/store/json-store";
import { pgDeleteFeedback, postgresEnabled } from "../src/core/store/simple-pg";

const MARKER = "ticket-2026-09-04-sg-neon-simple-stores-check";

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

function stripInboxById(id: string) {
  const inbox = path.join(process.cwd(), "docs", "feedback-inbox.md");
  if (!existsSync(inbox)) return;
  const text = readFileSync(inbox, "utf8");
  const parts = text.split(/\n---\n/);
  const kept = parts.filter((part) => !part.includes(`id: \`${id}\``));
  writeFileSync(inbox, kept.join("\n---\n"), "utf8");
}

async function checkZipExclude(): Promise<void> {
  const tmp = path.join(process.cwd(), ".tmp-check-deploy");
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(path.join(tmp, "data"), { recursive: true });
  writeFileSync(path.join(tmp, "data", "feedback.json"), "[]", "utf8");
  const removed = stripDeployDataDir(tmp);
  const stillThere = existsSync(path.join(tmp, "data"));
  rmSync(tmp, { recursive: true, force: true });
  if (!removed || stillThere) {
    throw new Error("stripDeployDataDir did not remove data/");
  }
  console.log("zip-exclude: stripDeployDataDir removes data/ — ok");
}

async function checkJsonFallback(): Promise<string> {
  delete process.env.DATABASE_URL;
  if (postgresEnabled()) {
    throw new Error("postgresEnabled() true after unsetting DATABASE_URL");
  }
  const record = await addFeedback({
    kind: "housekeeping",
    pageHref: "/i/feedback",
    pageTitle: "Simple-store check",
    message: MARKER,
    submittedBy: "check-simple-stores",
  });
  const file = path.join(process.cwd(), "data", "feedback.json");
  const raw = readFileSync(file, "utf8");
  const rows = JSON.parse(raw) as Array<{ id: string; message: string }>;
  const found = rows.find((row) => row.id === record.id && row.message === MARKER);
  if (!found) {
    throw new Error("JSON fallback: feedback.json missing the check row");
  }
  const next = rows.filter((row) => row.id !== record.id);
  writeFileSync(file, JSON.stringify(next, null, 2), "utf8");
  stripInboxById(record.id);
  console.log("json-fallback: addFeedback wrote data/feedback.json — ok");
  return record.id;
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
  const record = await addFeedback({
    kind: "housekeeping",
    pageHref: "/i/feedback",
    pageTitle: "Simple-store check",
    message: MARKER + "-pg",
    submittedBy: "check-simple-stores",
  });
  const all = await getFeedback();
  const found = all.find((row) => row.id === record.id);
  if (!found) {
    throw new Error("Postgres: getFeedback did not return the inserted row");
  }
  await pgDeleteFeedback(record.id);
  stripInboxById(record.id);
  console.log("postgres: addFeedback hit Postgres — ok (row deleted)");
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
