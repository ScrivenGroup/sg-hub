import { desc, eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
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
  kanbanIdeas,
  kanbanMeta,
  kanbanTickets,
  mrtDams,
  mrtShare,
  notes,
} from "@/core/store/schema";
import {
  MRT_RELATIONAL_DDL,
  assembleMrtStore,
  replaceMrtStore,
} from "@/core/store/mrt-relational";
import { scheduleStoreSchema } from "@/modules/sunwater-mrt/schema";
import type {
  KanbanInboxNote,
  KanbanMeta,
  KanbanTicket,
} from "@/core/kanban/schema";
import {
  kanbanInboxNoteSchema,
  kanbanMetaSchema,
  kanbanTicketSchema,
} from "@/core/kanban/schema";

export const MRT_LIVE_ID = "live";

export type MrtShareRow = {
  id: string;
  audience: string;
  enabled: boolean;
  passwordHash: string;
  salt: string;
  passwordVault?: string;
  expiresAt: string;
  updatedAt: string;
};

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
  ...MRT_RELATIONAL_DDL,
  `CREATE TABLE IF NOT EXISTS mrt_share (
    id text PRIMARY KEY,
    audience text NOT NULL,
    enabled boolean NOT NULL,
    password_hash text NOT NULL,
    salt text NOT NULL,
    password_vault text,
    expires_at text NOT NULL,
    updated_at text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS kanban_ideas (
    id text PRIMARY KEY,
    node_id text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    status text NOT NULL,
    created_at text NOT NULL,
    updated_at text NOT NULL,
    copied_at text
  )`,
  `CREATE INDEX IF NOT EXISTS kanban_ideas_node_id ON kanban_ideas (node_id)`,
  `CREATE TABLE IF NOT EXISTS kanban_tickets (
    id text PRIMARY KEY,
    node_id text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    lane text NOT NULL,
    "column" text NOT NULL,
    source_idea_id text,
    created_at text NOT NULL,
    updated_at text NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS kanban_tickets_node_id ON kanban_tickets (node_id)`,
  `CREATE TABLE IF NOT EXISTS kanban_meta (
    node_id text PRIMARY KEY,
    revision integer NOT NULL,
    updated_at text NOT NULL,
    published_at text,
    live_baseline jsonb,
    events jsonb NOT NULL,
    lanes jsonb NOT NULL
  )`,
];

type PgGlobal = {
  __sgPgSql?: Sql;
  __sgPgDb?: PostgresJsDatabase<SimpleSchema>;
  __sgPgReady?: Promise<void>;
};

function pgGlobal(): PgGlobal {
  return globalThis as typeof globalThis & PgGlobal;
}

export function databaseUrl(): string {
  return (process.env.DATABASE_URL ?? "").trim();
}

export function postgresEnabled(): boolean {
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

export async function pgDeleteChangelog(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(changelogs).where(eq(changelogs.id, id));
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

function shareFromRow(row: typeof mrtShare.$inferSelect): MrtShareRow {
  return {
    id: row.id,
    audience: row.audience,
    enabled: row.enabled,
    passwordHash: row.passwordHash,
    salt: row.salt,
    ...(row.passwordVault ? { passwordVault: row.passwordVault } : {}),
    expiresAt: row.expiresAt,
    updatedAt: row.updatedAt,
  };
}

export async function pgGetMrtLive(): Promise<unknown | null> {
  const db = await getDb();
  return assembleMrtStore(db);
}

export async function pgUpsertMrtLive(body: unknown): Promise<void> {
  const parsed = scheduleStoreSchema.parse(body);
  const db = await getDb();
  await replaceMrtStore(db, parsed);
}

export async function pgCountMrtDams(): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ id: mrtDams.id }).from(mrtDams);
  return rows.length;
}

export async function pgGetMrtShares(): Promise<MrtShareRow[]> {
  const db = await getDb();
  const rows = await db.select().from(mrtShare);
  return rows.map(shareFromRow);
}

export async function pgReplaceMrtShares(rows: MrtShareRow[]): Promise<void> {
  const db = await getDb();
  await db.delete(mrtShare);
  for (const row of rows) {
    await db.insert(mrtShare).values({
      id: row.id,
      audience: row.audience,
      enabled: row.enabled,
      passwordHash: row.passwordHash,
      salt: row.salt,
      passwordVault: row.passwordVault ?? null,
      expiresAt: row.expiresAt,
      updatedAt: row.updatedAt,
    });
  }
}

export async function pgEnd(): Promise<void> {
  const g = pgGlobal();
  if (g.__sgPgSql) {
    await g.__sgPgSql.end({ timeout: 5 });
    g.__sgPgSql = undefined;
    g.__sgPgDb = undefined;
    g.__sgPgReady = undefined;
  }
}

function ideaFromRow(row: typeof kanbanIdeas.$inferSelect): KanbanInboxNote {
  return kanbanInboxNoteSchema.parse({
    id: row.id,
    nodeId: row.nodeId,
    title: row.title,
    body: row.body,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    copiedAt: row.copiedAt,
  });
}

function ticketFromRow(row: typeof kanbanTickets.$inferSelect): KanbanTicket {
  return kanbanTicketSchema.parse({
    id: row.id,
    nodeId: row.nodeId,
    title: row.title,
    body: row.body,
    lane: row.lane,
    column: row.column,
    sourceIdeaId: row.sourceIdeaId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function metaFromRow(row: typeof kanbanMeta.$inferSelect): KanbanMeta {
  return kanbanMetaSchema.parse({
    nodeId: row.nodeId,
    revision: row.revision,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
    liveBaseline: row.liveBaseline,
    events: row.events,
    lanes: row.lanes,
  });
}

export async function pgGetKanbanIdeas(): Promise<KanbanInboxNote[]> {
  const db = await getDb();
  const rows = await db.select().from(kanbanIdeas);
  return rows.map(ideaFromRow);
}

export async function pgGetKanbanTickets(): Promise<KanbanTicket[]> {
  const db = await getDb();
  const rows = await db.select().from(kanbanTickets);
  return rows.map(ticketFromRow);
}

export async function pgGetKanbanMeta(): Promise<KanbanMeta[]> {
  const db = await getDb();
  const rows = await db.select().from(kanbanMeta);
  return rows.map(metaFromRow);
}

export async function pgUpsertKanbanIdea(row: KanbanInboxNote): Promise<void> {
  const db = await getDb();
  await db
    .insert(kanbanIdeas)
    .values({
      id: row.id,
      nodeId: row.nodeId,
      title: row.title,
      body: row.body,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      copiedAt: row.copiedAt ?? null,
    })
    .onConflictDoUpdate({
      target: kanbanIdeas.id,
      set: {
        nodeId: row.nodeId,
        title: row.title,
        body: row.body,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        copiedAt: row.copiedAt ?? null,
      },
    });
}

export async function pgUpsertKanbanTicket(row: KanbanTicket): Promise<void> {
  const db = await getDb();
  await db
    .insert(kanbanTickets)
    .values({
      id: row.id,
      nodeId: row.nodeId,
      title: row.title,
      body: row.body,
      lane: row.lane,
      column: row.column,
      sourceIdeaId: row.sourceIdeaId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
    .onConflictDoUpdate({
      target: kanbanTickets.id,
      set: {
        nodeId: row.nodeId,
        title: row.title,
        body: row.body,
        lane: row.lane,
        column: row.column,
        sourceIdeaId: row.sourceIdeaId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
}

export async function pgUpsertKanbanMeta(row: KanbanMeta): Promise<void> {
  const db = await getDb();
  await db
    .insert(kanbanMeta)
    .values({
      nodeId: row.nodeId,
      revision: row.revision,
      updatedAt: row.updatedAt,
      publishedAt: row.publishedAt,
      liveBaseline: row.liveBaseline,
      events: row.events,
      lanes: row.lanes,
    })
    .onConflictDoUpdate({
      target: kanbanMeta.nodeId,
      set: {
        revision: row.revision,
        updatedAt: row.updatedAt,
        publishedAt: row.publishedAt,
        liveBaseline: row.liveBaseline,
        events: row.events,
        lanes: row.lanes,
      },
    });
}

export async function pgReplaceKanbanRows(input: {
  ideas: KanbanInboxNote[];
  tickets: KanbanTicket[];
  meta: KanbanMeta[];
}): Promise<void> {
  const db = await getDb();
  await db.delete(kanbanIdeas);
  await db.delete(kanbanTickets);
  await db.delete(kanbanMeta);
  for (const row of input.ideas) await pgUpsertKanbanIdea(row);
  for (const row of input.tickets) await pgUpsertKanbanTicket(row);
  for (const row of input.meta) await pgUpsertKanbanMeta(row);
}

export async function pgDeleteKanbanIdea(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(kanbanIdeas).where(eq(kanbanIdeas.id, id));
}

