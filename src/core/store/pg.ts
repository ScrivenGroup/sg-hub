import { desc, eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type {
  ChangelogEntry,
  DependencyRecord,
  DevChoiceRecord,
  FeedbackRecord,
  IdeaRecord,
  NoteRecord,
} from "@/core/contracts/types";
import * as schema from "@/core/store/schema";
import {
  changelogs,
  dependencies,
  devChoices,
  feedback,
  ideas,
  notes,
} from "@/core/store/schema";

type SimpleSchema = typeof schema;

const DDL = [
  `CREATE TABLE IF NOT EXISTS feedback (
    id text PRIMARY KEY,
    created_at text NOT NULL,
    kind text NOT NULL,
    status text NOT NULL,
    page_href text NOT NULL,
    page_title text NOT NULL,
    message text NOT NULL,
    submitted_by text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ideas (
    id text PRIMARY KEY,
    title text NOT NULL,
    body text NOT NULL,
    created_at text NOT NULL,
    status text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notes (
    id text PRIMARY KEY,
    title text NOT NULL,
    body text NOT NULL,
    updated_at text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS changelogs (
    id text PRIMARY KEY,
    node_id text NOT NULL,
    created_at text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    kind text,
    version text
  )`,
  `CREATE TABLE IF NOT EXISTS dependencies (
    id text PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL,
    expires_at text,
    external_url text,
    notes text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dev_choices (
    id text PRIMARY KEY,
    created_at text NOT NULL,
    layer text NOT NULL,
    status text NOT NULL,
    decision text NOT NULL,
    why text
  )`,
];

type PgGlobal = {
  __sgPgSql?: postgres.Sql;
  __sgPgDb?: PostgresJsDatabase<SimpleSchema>;
  __sgPgReady?: Promise<void>;
};

function pgGlobal(): PgGlobal {
  return globalThis as typeof globalThis & PgGlobal;
}

export function databaseUrl(): string {
  return (process.env.DATABASE_URL ?? "").trim();
}

export function usePostgres(): boolean {
  return Boolean(databaseUrl());
}

export function dualWriteJson(): boolean {
  return process.env.SIMPLE_STORE_DUAL_WRITE === "1";
}

async function getDb(): Promise<PostgresJsDatabase<SimpleSchema>> {
  const url = databaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const g = pgGlobal();
  if (!g.__sgPgSql) {
    g.__sgPgSql = postgres(url, { max: 3, prepare: false });
    g.__sgPgDb = drizzle(g.__sgPgSql, { schema });
  }
  if (!g.__sgPgReady) {
    g.__sgPgReady = (async () => {
      for (const stmt of DDL) {
        await g.__sgPgSql!.unsafe(stmt);
      }
    })();
  }
  await g.__sgPgReady;
  return g.__sgPgDb!;
}

export async function pgGetFeedback(): Promise<FeedbackRecord[]> {
  const db = await getDb();
  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  return rows as FeedbackRecord[];
}

export async function pgInsertFeedback(row: FeedbackRecord): Promise<void> {
  const db = await getDb();
  await db.insert(feedback).values(row);
}

export async function pgDeleteFeedback(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(feedback).where(eq(feedback.id, id));
}

export async function pgGetIdeas(): Promise<IdeaRecord[]> {
  const db = await getDb();
  const rows = await db.select().from(ideas);
  return rows as IdeaRecord[];
}

export async function pgReplaceIdeas(rows: IdeaRecord[]): Promise<void> {
  const db = await getDb();
  for (const row of rows) {
    await db.insert(ideas).values(row).onConflictDoUpdate({
      target: ideas.id,
      set: {
        title: row.title,
        body: row.body,
        createdAt: row.createdAt,
        status: row.status,
      },
    });
  }
}

export async function pgGetNotes(): Promise<NoteRecord[]> {
  const db = await getDb();
  const rows = await db.select().from(notes);
  return rows as NoteRecord[];
}

export async function pgReplaceNotes(rows: NoteRecord[]): Promise<void> {
  const db = await getDb();
  for (const row of rows) {
    await db.insert(notes).values(row).onConflictDoUpdate({
      target: notes.id,
      set: {
        title: row.title,
        body: row.body,
        updatedAt: row.updatedAt,
      },
    });
  }
}

export async function pgGetChangelogs(): Promise<ChangelogEntry[]> {
  const db = await getDb();
  const rows = await db.select().from(changelogs);
  return rows.map((row) => ({
    id: row.id,
    nodeId: row.nodeId,
    createdAt: row.createdAt,
    title: row.title,
    body: row.body,
    ...(row.kind ? { kind: row.kind as ChangelogEntry["kind"] } : {}),
    ...(row.version ? { version: row.version } : {}),
  }));
}

export async function pgReplaceChangelogs(rows: ChangelogEntry[]): Promise<void> {
  const db = await getDb();
  for (const row of rows) {
    await db.insert(changelogs).values({
      id: row.id,
      nodeId: row.nodeId,
      createdAt: row.createdAt,
      title: row.title,
      body: row.body,
      kind: row.kind ?? null,
      version: row.version ?? null,
    }).onConflictDoUpdate({
      target: changelogs.id,
      set: {
        nodeId: row.nodeId,
        createdAt: row.createdAt,
        title: row.title,
        body: row.body,
        kind: row.kind ?? null,
        version: row.version ?? null,
      },
    });
  }
}

export async function pgGetDependencies(): Promise<DependencyRecord[]> {
  const db = await getDb();
  const rows = await db.select().from(dependencies);
  return rows as DependencyRecord[];
}

export async function pgReplaceDependencies(
  rows: DependencyRecord[],
): Promise<void> {
  const db = await getDb();
  for (const row of rows) {
    await db.insert(dependencies).values({
      id: row.id,
      name: row.name,
      type: row.type,
      expiresAt: row.expiresAt,
      externalUrl: row.externalUrl,
      notes: row.notes,
    }).onConflictDoUpdate({
      target: dependencies.id,
      set: {
        name: row.name,
        type: row.type,
        expiresAt: row.expiresAt,
        externalUrl: row.externalUrl,
        notes: row.notes,
      },
    });
  }
}

export async function pgGetDevChoices(): Promise<DevChoiceRecord[]> {
  const db = await getDb();
  const rows = await db.select().from(devChoices);
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    layer: row.layer,
    status: row.status as DevChoiceRecord["status"],
    decision: row.decision,
    ...(row.why ? { why: row.why } : {}),
  }));
}

export async function pgReplaceDevChoices(
  rows: DevChoiceRecord[],
): Promise<void> {
  const db = await getDb();
  for (const row of rows) {
    await db.insert(devChoices).values({
      id: row.id,
      createdAt: row.createdAt,
      layer: row.layer,
      status: row.status,
      decision: row.decision,
      why: row.why ?? null,
    }).onConflictDoUpdate({
      target: devChoices.id,
      set: {
        createdAt: row.createdAt,
        layer: row.layer,
        status: row.status,
        decision: row.decision,
        why: row.why ?? null,
      },
    });
  }
}

export async function pgInsertDevChoice(row: DevChoiceRecord): Promise<void> {
  const db = await getDb();
  await db.insert(devChoices).values({
    id: row.id,
    createdAt: row.createdAt,
    layer: row.layer,
    status: row.status,
    decision: row.decision,
    why: row.why ?? null,
  });
}
