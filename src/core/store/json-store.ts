import { promises as fs } from "fs";
import path from "path";
import {
  seedChangelogs,
  seedDependencies,
  seedDevChoices,
  seedNotes,
} from "@/core/registry/seed";
import type {
  ChangelogEntry,
  DependencyRecord,
  DevChoiceRecord,
  FeedbackRecord,
  IdeaRecord,
  NoteRecord,
} from "@/core/contracts/types";
import {
  emptyKanbanMeta,
  kanbanAttachmentStoreRowSchema,
  kanbanInboxNoteSchema,
  kanbanMetaSchema,
  kanbanTicketSchema,
  prependEvent,
  type KanbanAttachmentMeta,
  type KanbanAttachmentStoreRow,
  type KanbanBoard,
  type KanbanEvent,
  type KanbanInboxNote,
  type KanbanMeta,
  type KanbanTicket,
  boardFromRows,
  KANBAN_GLOBAL_NODE_ID,
  isFeedbackRegisterNote,
  nextInboxId,
  normalizeInboxNote,
} from "@/core/kanban/schema";
import { defaultKanbanNodeIdFromHref } from "@/core/kanban/leaves";
import { boardFromUnknown } from "@/core/kanban/pack";
import { applyKanbanHygiene, missingKanbanSeed } from "@/core/kanban/seed";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_PER_NOTE,
  newAttachmentId,
  safeFilename,
} from "@/core/kanban/attachments";
import {
  emptyScheduleStore,
  scheduleStoreSchema,
  type ScheduleStore,
} from "@/modules/sunwater-mrt/schema";
import { normalizeScheduleStore } from "@/modules/sunwater-mrt/logic/normalize-store";
import type { MrtGuestActivity } from "@/modules/sunwater-mrt/share-public";
import { withAllocateResults } from "@/modules/mtg-buylist/logic/allocate";
import {
  assembleBuylistStore,
  archiveFromMeta,
  emptyBuylistHarvest,
  emptyBuylistOwnerIndex,
  emptyBuylistRunFile,
  harvestHasStoredData,
  metaFromRun,
  newBuylistRunId,
  pickArchiveVictim,
  runHasStoredData,
  runNeedsAllocate,
  shouldArchiveForNewRun,
  splitBuylistStore,
  splitLegacyStore,
} from "@/modules/mtg-buylist/logic/runs";
import {
  buylistHarvestSchema,
  buylistOwnerIndexSchema,
  buylistRunFileSchema,
  emptyPreconCatalog,
  emptyPreconHarvestBook,
  mtgBuylistStoreSchema,
  preconCatalogSchema,
  preconHarvestBookSchema,
  type BuylistArchive,
  type BuylistHarvest,
  type BuylistOwnerIndex,
  type BuylistRunFile,
  type BuylistRunMeta,
  type MtgBuylistStore,
  type PlaymantisHarvestDiffRow,
  type PreconCatalog,
  type PreconDeck,
  type PreconHarvestBook,
} from "@/modules/mtg-buylist/schema";
import { loadTurtlePowerDeck, TURTLE_POWER_ID } from "@/modules/mtg-buylist/fixtures/precons/turtle-power";
import { buildMockPreconHarvest } from "@/modules/mtg-buylist/logic/precon-harvest";
import type {
  StandardsChoices,
  StandardsHoldRecord,
} from "@/modules/standards/schema";
import {
  dualWriteJson,
  pgGetChangelogs,
  pgGetDependencies,
  pgGetDevChoices,
  pgGetFeedback,
  pgGetNotes,
  pgDeleteChangelog,
  pgInsertDevChoice,
  pgReplaceChangelogs,
  pgReplaceDependencies,
  pgReplaceDevChoices,
  pgReplaceNotes,
  pgGetMrtLive,
  pgUpsertMrtLive,
  postgresEnabled,
  pgGetKanbanIdeas,
  pgGetKanbanTickets,
  pgGetKanbanMeta,
  pgUpsertKanbanIdea,
  pgUpsertKanbanTicket,
  pgUpsertKanbanMeta,
  pgGetKanbanAttachmentMeta,
  pgGetKanbanAttachment,
  pgInsertKanbanAttachment,
  pgDeleteKanbanAttachment,
  pgRetagKanbanAttachments,
  pgGetKanbanLeafNote,
  pgUpsertKanbanLeafNote,
  pgGetStandardsChoices,
  pgUpsertStandardsChoice,
  pgReplaceStandardsChoices,
  pgGetStandardsHolds,
  pgInsertStandardsHold,
  pgDeleteStandardsHold,
  pgInsertPlaymantisHarvestDiff,
  pgListPlaymantisHarvestDiff,
  pgClearPlaymantisHarvestDiff,
  pgMarkPlaymantisHarvestDiffLookedAt,
} from "@/core/store/simple-pg";

const dataDir = path.join(process.cwd(), "data");
const devChoicesPath = path.join(process.cwd(), "docs", "DEV_CHOICES.md");

async function ensureDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  await ensureDir();
  const full = path.join(dataDir, file);
  try {
    const raw = await fs.readFile(full, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

async function writeJson<T>(file: string, value: T): Promise<void> {
  await ensureDir();
  const full = path.join(dataDir, file);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(value, null, 2), "utf8");
}

function sandboxFile(guestId: string) {
  const key = guestId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "guest";
  return path.join("mrt-sandboxes", `${key}.json`);
}

const DEFAULT_SANDBOX_TTL_HOURS = 168;

function sandboxTtlMs(): number {
  const raw = process.env.MRT_SANDBOX_TTL_HOURS;
  const hours = raw ? Number(raw) : DEFAULT_SANDBOX_TTL_HOURS;
  if (!Number.isFinite(hours) || hours <= 0) {
    return DEFAULT_SANDBOX_TTL_HOURS * 3600 * 1000;
  }
  return hours * 3600 * 1000;
}

function cloneStore(store: ScheduleStore): ScheduleStore {
  return JSON.parse(JSON.stringify(store)) as ScheduleStore;
}

async function liveMrtClone(): Promise<ScheduleStore> {
  return cloneStore(await getSunwaterMrtStore());
}

export async function getGuestMrtSandbox(guestId: string): Promise<ScheduleStore> {
  const rel = sandboxFile(guestId);
  const full = path.join(dataDir, rel);
  const clone = await liveMrtClone();

  await ensureDir();
  await fs.mkdir(path.dirname(full), { recursive: true });

  let stale = true;
  try {
    const stat = await fs.stat(full);
    stale = Date.now() - stat.mtimeMs > sandboxTtlMs();
  } catch {
    stale = true;
  }

  if (stale) {
    await writeJson(rel, clone);
    return normalizeScheduleStore(clone).store;
  }

  const raw = await readJson(rel, clone);
  const parsed = scheduleStoreSchema.safeParse(raw);
  if (parsed.success) return normalizeScheduleStore(parsed.data).store;
  return normalizeScheduleStore(clone).store;
}

export async function saveGuestMrtSandbox(
  guestId: string,
  store: ScheduleStore,
): Promise<void> {
  const parsed = scheduleStoreSchema.parse(store);
  await writeJson(sandboxFile(guestId), parsed);
}

export async function resetGuestMrtSandbox(
  guestId: string,
): Promise<ScheduleStore> {
  const clone = await liveMrtClone();
  const parsed = scheduleStoreSchema.parse(clone);
  await writeJson(sandboxFile(guestId), parsed);
  return normalizeScheduleStore(parsed).store;
}

export type { MrtGuestActivity } from "@/modules/sunwater-mrt/share-public";

export async function logMrtGuestActivity(
  entry: Omit<MrtGuestActivity, "at">,
): Promise<void> {
  const all = await readJson("mrt-guest-activity.json", [] as MrtGuestActivity[]);
  all.unshift({ ...entry, at: new Date().toISOString() });
  await writeJson("mrt-guest-activity.json", all.slice(0, 500));
}

export async function getMrtGuestActivity(): Promise<MrtGuestActivity[]> {
  return readJson("mrt-guest-activity.json", [] as MrtGuestActivity[]);
}

async function persistSimpleJson<T>(file: string, value: T): Promise<void> {
  if (!postgresEnabled() || dualWriteJson()) {
    await writeJson(file, value);
  }
}

export async function getDependencies(): Promise<DependencyRecord[]> {
  const existing = postgresEnabled()
    ? await pgGetDependencies()
    : await readJson("dependencies.json", seedDependencies);
  const byId = new Map(existing.map((row) => [row.id, row]));
  let changed = false;
  for (const seeded of seedDependencies) {
    if (!byId.has(seeded.id)) {
      byId.set(seeded.id, seeded);
      changed = true;
    }
  }
  const out = Array.from(byId.values());
  if (changed) {
    if (postgresEnabled()) await pgReplaceDependencies(out);
    await persistSimpleJson("dependencies.json", out);
  }
  return out;
}

const RETIRED_CHANGELOG_IDS = [
  "cl-kanban-online-chrome",
  "cl-kanban-online-chrome-row",
  "cl-mtg-buylist-1",
  "cl-mtg-buylist-kanban",
];

export async function getChangelogs(): Promise<ChangelogEntry[]> {
  const existing = postgresEnabled()
    ? await pgGetChangelogs()
    : await readJson("changelogs.json", seedChangelogs);
  const byId = new Map(existing.map((c) => [c.id, c]));
  let changed = false;
  const retiredHit: string[] = [];
  for (const id of RETIRED_CHANGELOG_IDS) {
    if (byId.delete(id)) {
      retiredHit.push(id);
      changed = true;
    }
  }
  for (const seeded of seedChangelogs) {
    const current = byId.get(seeded.id);
    if (!current) {
      byId.set(seeded.id, seeded);
      changed = true;
      continue;
    }
    if (seeded.kind === "release") {
      if (
        current.kind !== "release" ||
        current.version !== seeded.version ||
        current.title !== seeded.title ||
        current.body !== seeded.body ||
        current.createdAt !== seeded.createdAt
      ) {
        byId.set(seeded.id, {
          ...current,
          kind: "release",
          version: seeded.version ?? current.version,
          title: seeded.title,
          body: seeded.body,
          createdAt: seeded.createdAt,
        });
        changed = true;
      }
      continue;
    }
    if (
      current.title !== seeded.title ||
      current.body !== seeded.body ||
      current.kind !== seeded.kind ||
      current.version !== seeded.version ||
      current.createdAt !== seeded.createdAt
    ) {
      byId.set(seeded.id, {
        ...current,
        title: seeded.title,
        body: seeded.body,
        kind: seeded.kind,
        version: seeded.version,
        createdAt: seeded.createdAt,
      });
      changed = true;
    }
  }
  const out = Array.from(byId.values());
  if (changed) {
    if (postgresEnabled()) {
      for (const id of retiredHit) await pgDeleteChangelog(id);
      await pgReplaceChangelogs(out);
    }
    await persistSimpleJson("changelogs.json", out);
  }
  return out;
}

/** Later hub Changelog register reads this store by nodeId / all nodes. */
export async function getChangelogsForNode(
  nodeId: string,
): Promise<ChangelogEntry[]> {
  const all = await getChangelogs();
  return all.filter((c) => c.nodeId === nodeId);
}

export async function getChangelogsForNodes(
  nodeIds: readonly string[],
): Promise<ChangelogEntry[]> {
  const all = await getChangelogs();
  const ids = new Set(nodeIds);
  return all.filter((c) => ids.has(c.nodeId));
}

export async function getIdeas(): Promise<IdeaRecord[]> {
  const notes = await listKanbanIdeas();
  return notes
    .filter((row) => (row.kind ?? "idea") === "idea")
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt,
      status:
        row.status === "archived"
          ? "done"
          : row.status === "open"
            ? "inbox"
            : "parked",
    }));
}

export async function getNotes(): Promise<NoteRecord[]> {
  if (postgresEnabled()) {
    const rows = await pgGetNotes();
    if (rows.length > 0) return rows;
    await pgReplaceNotes(seedNotes);
    await persistSimpleJson("notes.json", seedNotes);
    return seedNotes;
  }
  return readJson("notes.json", seedNotes);
}

export async function getFeedback(): Promise<FeedbackRecord[]> {
  const notes = await listKanbanIdeas();
  return notes
    .filter(isFeedbackRegisterNote)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(inboxNoteToFeedbackRecord);
}

export async function getDevChoices(): Promise<DevChoiceRecord[]> {
  const existing = postgresEnabled()
    ? await pgGetDevChoices()
    : await readJson("dev-choices.json", seedDevChoices);
  const byId = new Map(existing.map((row) => [row.id, row]));
  let changed = false;
  for (const seeded of seedDevChoices) {
    const current = byId.get(seeded.id);
    if (!current) {
      byId.set(seeded.id, seeded);
      changed = true;
      continue;
    }
    if (
      current.layer !== seeded.layer ||
      current.status !== seeded.status ||
      current.decision !== seeded.decision ||
      current.why !== seeded.why
    ) {
      byId.set(seeded.id, {
        ...current,
        layer: seeded.layer,
        status: seeded.status,
        decision: seeded.decision,
        why: seeded.why,
      });
      changed = true;
    }
  }
  const out = Array.from(byId.values());
  if (changed) {
    if (postgresEnabled()) await pgReplaceDevChoices(out);
    await persistSimpleJson("dev-choices.json", out);
  }
  return out;
}

function asChoices(rows: unknown): StandardsChoices {
  if (!rows || typeof rows !== "object" || Array.isArray(rows)) return {};
  const out: StandardsChoices = {};
  for (const [key, value] of Object.entries(rows as Record<string, unknown>)) {
    if (typeof value === "string" && value) out[key] = value;
  }
  return out;
}

export async function getStandardsChoices(): Promise<StandardsChoices> {
  if (postgresEnabled()) {
    const rows = await pgGetStandardsChoices();
    if (Object.keys(rows).length > 0) return rows;
    const fromJson = asChoices(
      await readJsonIfExists<StandardsChoices>("standards-choices.json"),
    );
    if (Object.keys(fromJson).length > 0) {
      await pgReplaceStandardsChoices(fromJson, new Date().toISOString());
    }
    return fromJson;
  }
  return asChoices(
    await readJson("standards-choices.json", {} as StandardsChoices),
  );
}

export async function setStandardsChoice(entryId: string, optionId: string): Promise<void> {
  const all = await getStandardsChoices();
  all[entryId] = optionId;
  if (postgresEnabled()) {
    await pgUpsertStandardsChoice(entryId, optionId, new Date().toISOString());
  }
  await persistSimpleJson("standards-choices.json", all);
}

export async function getStandardsHolds(): Promise<StandardsHoldRecord[]> {
  if (postgresEnabled()) {
    const rows = await pgGetStandardsHolds();
    if (rows.length > 0) return rows;
    const fromJson = await readJsonIfExists<StandardsHoldRecord[]>(
      "standards-hold.json",
    );
    const list = Array.isArray(fromJson) ? fromJson : [];
    for (const row of list) await pgInsertStandardsHold(row);
    return list;
  }
  const rows = await readJson("standards-hold.json", [] as StandardsHoldRecord[]);
  return Array.isArray(rows) ? rows : [];
}

export async function addStandardsHold(
  entry: Omit<StandardsHoldRecord, "id" | "createdAt">,
): Promise<StandardsHoldRecord> {
  const record: StandardsHoldRecord = {
    ...entry,
    id: `sh-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  };
  if (postgresEnabled()) {
    await pgInsertStandardsHold(record);
    await persistSimpleJson(
      "standards-hold.json",
      await pgGetStandardsHolds(),
    );
    return record;
  }
  const all = await getStandardsHolds();
  all.unshift(record);
  await writeJson("standards-hold.json", all);
  return record;
}

export async function removeStandardsHold(id: string): Promise<void> {
  if (postgresEnabled()) {
    await pgDeleteStandardsHold(id);
    await persistSimpleJson(
      "standards-hold.json",
      await pgGetStandardsHolds(),
    );
    return;
  }
  const all = await getStandardsHolds();
  await writeJson(
    "standards-hold.json",
    all.filter((row) => row.id !== id),
  );
}

export async function addDevChoice(
  entry: Omit<DevChoiceRecord, "id" | "createdAt">,
): Promise<DevChoiceRecord> {
  const all = await getDevChoices();
  const record: DevChoiceRecord = {
    ...entry,
    id: `dc-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  };
  all.unshift(record);
  if (postgresEnabled()) await pgInsertDevChoice(record);
  await persistSimpleJson("dev-choices.json", all);
  await appendDevChoicesDoc(record);
  return record;
}

export async function getSunwaterMrtStore(): Promise<ScheduleStore> {
  const fallback = emptyScheduleStore();
  if (postgresEnabled()) {
    const raw = await pgGetMrtLive();
    if (raw == null) {
      return normalizeScheduleStore(fallback).store;
    }
    const parsed = scheduleStoreSchema.safeParse(raw);
    let store: ScheduleStore;
    if (parsed.success) {
      store = parsed.data;
    } else {
      const merged = scheduleStoreSchema.safeParse({
        ...fallback,
        ...(raw && typeof raw === "object" ? raw : {}),
      });
      if (!merged.success) {
        return normalizeScheduleStore(fallback).store;
      }
      store = merged.data;
    }
    const normalized = normalizeScheduleStore(store);
    if (normalized.changed) {
      const checked = scheduleStoreSchema.safeParse(normalized.store);
      const next = checked.success ? checked.data : normalized.store;
      await pgUpsertMrtLive(next);
      return next;
    }
    return normalized.store;
  }

  const raw = await readJson("sunwater-mrt.json", fallback);
  const parsed = scheduleStoreSchema.safeParse(raw);
  let store: ScheduleStore;
  if (parsed.success) {
    store = parsed.data;
  } else {
    const merged = scheduleStoreSchema.safeParse({
      ...fallback,
      ...(raw && typeof raw === "object" ? raw : {}),
    });
    if (merged.success) store = merged.data;
    else {
      await writeJson("sunwater-mrt.json", fallback);
      store = fallback;
    }
  }
  if (store.dams.length < 20) {
    const next = emptyScheduleStore();
    next.openNotes = store.openNotes || "";
    store = next;
    const normalized = normalizeScheduleStore(store);
    const checked = scheduleStoreSchema.safeParse(normalized.store);
    if (checked.success) {
      await writeJson("sunwater-mrt.json", checked.data);
      return checked.data;
    }
    await writeJson("sunwater-mrt.json", normalized.store);
    return normalized.store;
  }
  const normalized = normalizeScheduleStore(store);
  if (normalized.changed) {
    const checked = scheduleStoreSchema.safeParse(normalized.store);
    if (checked.success) {
      await writeJson("sunwater-mrt.json", checked.data);
      return checked.data;
    }
  }
  return normalized.store;
}

export async function saveSunwaterMrtStore(
  store: ScheduleStore,
): Promise<void> {
  const parsed = scheduleStoreSchema.parse(store);
  if (postgresEnabled()) {
    await pgUpsertMrtLive(parsed);
    return;
  }
  await writeJson("sunwater-mrt.json", parsed);
}

function mtgBuylistOwnerKey(userKey: string) {
  return userKey.replace(/[^a-zA-Z0-9._@-]/g, "_").slice(0, 80) || "user";
}

function mtgBuylistLegacyFile(userKey: string) {
  return path.join("mtg-buylist", `${mtgBuylistOwnerKey(userKey)}.json`);
}

function mtgBuylistOwnerDir(userKey: string) {
  return path.join("mtg-buylist", mtgBuylistOwnerKey(userKey));
}

function mtgBuylistIndexFile(userKey: string) {
  return path.join(mtgBuylistOwnerDir(userKey), "index.json");
}

function mtgBuylistHarvestFile(userKey: string) {
  return path.join(mtgBuylistOwnerDir(userKey), "harvest.json");
}

function mtgBuylistRunFile(userKey: string, runId: string) {
  const id = runId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "this";
  return path.join(mtgBuylistOwnerDir(userKey), `${id}.json`);
}

async function removeJson(file: string) {
  try {
    await fs.unlink(path.join(dataDir, file));
  } catch {
    /* missing is fine */
  }
}

/** Drop legacy `result`; fill null stream results if missing. */
function migrateMtgBuylistStore(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  if ("result" in obj && !("resultCompare" in obj)) {
    obj.resultCompare = obj.result ?? null;
  }
  delete obj.result;
  if (!("resultPm" in obj)) obj.resultPm = null;
  if (!("resultMate" in obj)) obj.resultMate = null;
  if (!("resultCompare" in obj)) obj.resultCompare = null;
  if (!obj.mateConfirmations || typeof obj.mateConfirmations !== "object") {
    obj.mateConfirmations = {};
  }
  const csv = obj.csv;
  if (csv && typeof csv === "object") {
    const bag = csv as Record<string, unknown>;
    if (typeof bag.priceSource !== "string") bag.priceSource = "other";
    if (typeof bag.priceCurrency !== "string") bag.priceCurrency = "";
  }
  return obj;
}

async function writeOwnerIndex(userKey: string, index: BuylistOwnerIndex) {
  const parsed = buylistOwnerIndexSchema.parse(index);
  await writeJson(mtgBuylistIndexFile(userKey), parsed);
}

async function writeOwnerHarvest(userKey: string, harvest: BuylistHarvest) {
  const parsed = buylistHarvestSchema.parse(harvest);
  await writeJson(mtgBuylistHarvestFile(userKey), parsed);
}

async function writeOwnerRun(userKey: string, run: BuylistRunFile) {
  const parsed = buylistRunFileSchema.parse({
    ...run,
    updatedAt: new Date().toISOString(),
  });
  await writeJson(mtgBuylistRunFile(userKey, parsed.id), parsed);
  return parsed;
}

async function readOwnerHarvest(userKey: string): Promise<BuylistHarvest> {
  const raw = await readJsonIfExists<unknown>(mtgBuylistHarvestFile(userKey));
  const parsed = buylistHarvestSchema.safeParse(raw ?? emptyBuylistHarvest());
  return parsed.success ? parsed.data : emptyBuylistHarvest();
}

async function readOwnerRun(userKey: string, runId: string): Promise<BuylistRunFile> {
  const raw = await readJsonIfExists<unknown>(mtgBuylistRunFile(userKey, runId));
  const parsed = buylistRunFileSchema.safeParse(raw ?? emptyBuylistRunFile(runId));
  if (parsed.success) return parsed.data;
  return emptyBuylistRunFile(runId);
}

async function foldSharedHarvestIntoRun(
  userKey: string,
  index: BuylistOwnerIndex,
): Promise<BuylistOwnerIndex> {
  if (index.harvestFolded) return index;
  const harvest = await readOwnerHarvest(userKey);
  if (!harvestHasStoredData(harvest)) {
    const next = { ...index, harvestFolded: true };
    await writeOwnerIndex(userKey, next);
    return next;
  }
  const targetId =
    (index.activeRunId && index.runs.some((run) => run.id === index.activeRunId)
      ? index.activeRunId
      : index.runs[0]?.id) || "";
  if (!targetId) {
    await writeOwnerHarvest(userKey, emptyBuylistHarvest());
    const next = { ...index, harvestFolded: true };
    await writeOwnerIndex(userKey, next);
    return next;
  }
  const run = await readOwnerRun(userKey, targetId);
  const folded = {
    ...run,
    mate: run.mate ?? harvest.mate,
    playmantis: run.playmantis ?? harvest.playmantis,
    mateImageLinks: Object.keys(run.mateImageLinks || {}).length
      ? run.mateImageLinks
      : harvest.mateImageLinks || {},
  };
  await writeOwnerRun(userKey, folded);
  await writeOwnerHarvest(userKey, emptyBuylistHarvest());
  const next = {
    ...index,
    harvestFolded: true,
    runs: index.runs.map((meta) =>
      meta.id === targetId ? metaFromRun(folded, meta.name) : meta,
    ),
  };
  await writeOwnerIndex(userKey, next);
  return next;
}

async function ensureBuylistOwner(userKey: string): Promise<BuylistOwnerIndex> {
  const existing = await readJsonIfExists<unknown>(mtgBuylistIndexFile(userKey));
  const parsedIndex = buylistOwnerIndexSchema.safeParse(existing);
  if (parsedIndex.success) {
    if (parsedIndex.data.harvestFolded) return parsedIndex.data;
    return foldSharedHarvestIntoRun(userKey, parsedIndex.data);
  }

  const legacyRaw = await readJsonIfExists<unknown>(mtgBuylistLegacyFile(userKey));
  if (legacyRaw && typeof legacyRaw === "object") {
    const migrated = migrateMtgBuylistStore(legacyRaw);
    const parsed = mtgBuylistStoreSchema.safeParse(migrated);
    if (parsed.success) {
      const split = splitLegacyStore(parsed.data);
      await writeOwnerIndex(userKey, split.index);
      await writeOwnerHarvest(userKey, emptyBuylistHarvest());
      if (split.index.runs.length) await writeOwnerRun(userKey, split.run);
      await removeJson(mtgBuylistLegacyFile(userKey));
      return split.index;
    }
  }

  const index = emptyBuylistOwnerIndex();
  await writeOwnerIndex(userKey, index);
  await writeOwnerHarvest(userKey, emptyBuylistHarvest());
  return index;
}

export type BuylistWorkspacePack = {
  store: MtgBuylistStore;
  runs: BuylistRunMeta[];
  activeRunId: string;
  archives: BuylistArchive[];
};

async function loadBuylistPack(userKey: string, runId?: string | null): Promise<BuylistWorkspacePack> {
  const index = await ensureBuylistOwner(userKey);
  const wanted = (runId || "").trim();
  const active = wanted && index.runs.some((run) => run.id === wanted) ? wanted : "";
  if (!active) {
    const idleRun = emptyBuylistRunFile("");
    idleRun.updatedAt = "idle";
    return {
      store: assembleBuylistStore(index, idleRun),
      runs: index.runs,
      activeRunId: "",
      archives: index.archives || [],
    };
  }
  const run = await readOwnerRun(userKey, active);
  const assembled = assembleBuylistStore(index, { ...run, id: active });
  return {
    store: runNeedsAllocate(assembled) ? withAllocateResults(assembled) : assembled,
    runs: index.runs,
    activeRunId: active,
    archives: index.archives || [],
  };
}

export async function getMtgBuylistWorkspace(
  userKey: string,
  runId?: string | null,
): Promise<BuylistWorkspacePack> {
  return loadBuylistPack(userKey, runId);
}

export async function getMtgBuylistStore(
  userKey: string,
  runId?: string | null,
): Promise<MtgBuylistStore> {
  return (await loadBuylistPack(userKey, runId)).store;
}

export async function getMtgBuylistNotes(userKey: string): Promise<string> {
  const index = await ensureBuylistOwner(userKey);
  return index.notes || "";
}

export async function listBuylistArchives(userKey: string): Promise<BuylistArchive[]> {
  const index = await ensureBuylistOwner(userKey);
  return index.archives || [];
}

export async function saveMtgBuylistNotes(userKey: string, notes: string): Promise<void> {
  const index = await ensureBuylistOwner(userKey);
  index.notes = notes;
  await writeOwnerIndex(userKey, index);
}

export async function saveMtgBuylistStore(
  userKey: string,
  store: MtgBuylistStore,
  runId?: string | null,
): Promise<string> {
  const index = await ensureBuylistOwner(userKey);
  let archives = [...(index.archives || [])];
  let runs = [...index.runs];
  let id = (runId || "").trim();
  if (!id) {
    if (shouldArchiveForNewRun(runs.length)) {
      const victim = pickArchiveVictim(runs) || runs[0];
      if (victim) {
        archives = [archiveFromMeta(victim), ...archives].slice(0, 40);
        runs = runs.filter((run) => run.id !== victim.id);
        await removeJson(mtgBuylistRunFile(userKey, victim.id));
      }
    }
    id = newBuylistRunId();
  }
  const parsed = mtgBuylistStoreSchema.parse({
    ...store,
    updatedAt: new Date().toISOString(),
  });
  const split = splitBuylistStore(parsed, id);
  const savedRun = await writeOwnerRun(userKey, split.run);
  const nextRuns = runs.some((run) => run.id === id)
    ? runs.map((run) => (run.id === id ? metaFromRun(savedRun, run.name) : run))
    : [...runs, metaFromRun(savedRun)];
  await writeOwnerIndex(userKey, {
    ...index,
    notes: parsed.notes || index.notes,
    activeRunId: id,
    runs: nextRuns,
    archives,
  });
  return id;
}

/** Leave no run selected. Does not create a blank folder. */
export async function idleMtgBuylistRun(userKey: string): Promise<BuylistWorkspacePack> {
  const index = await ensureBuylistOwner(userKey);
  if (index.activeRunId) {
    await writeOwnerIndex(userKey, { ...index, activeRunId: "" });
  }
  return loadBuylistPack(userKey, "");
}

export async function createMtgBuylistRun(userKey: string): Promise<BuylistWorkspacePack> {
  return idleMtgBuylistRun(userKey);
}

/** Wipe this run’s CSV, Mate, Playmantis, and results. Other tabs keep theirs. Zero runs is allowed. */
export async function clearMtgBuylistStore(
  userKey: string,
  runId?: string | null,
): Promise<BuylistWorkspacePack> {
  const index = await ensureBuylistOwner(userKey);
  const id = (runId || "").trim() || index.activeRunId;
  if (!id) return loadBuylistPack(userKey, "");
  const remaining = index.runs.filter((run) => run.id !== id);
  await removeJson(mtgBuylistRunFile(userKey, id));
  const stay =
    remaining.some((run) => run.id === index.activeRunId) && index.activeRunId !== id
      ? index.activeRunId
      : "";
  await writeOwnerIndex(userKey, {
    ...index,
    activeRunId: stay,
    runs: remaining,
  });
  return loadBuylistPack(userKey, stay);
}

const PRECON_CATALOG_FILE = path.join("mtg-buylist", "precons", "catalog.json");
const PRECON_HARVEST_FILE = path.join("mtg-buylist", "precons", "harvest.json");

export async function getPreconCatalog(): Promise<PreconCatalog> {
  const raw = await readJson<PreconCatalog>(PRECON_CATALOG_FILE, emptyPreconCatalog());
  let parsed: PreconCatalog;
  try {
    parsed = preconCatalogSchema.parse(raw);
  } catch {
    parsed = emptyPreconCatalog();
  }
  if (!parsed.decks.some((deck) => deck.id === TURTLE_POWER_ID)) {
    parsed = {
      updatedAt: new Date().toISOString(),
      decks: [loadTurtlePowerDeck(), ...parsed.decks],
    };
    await writeJson(PRECON_CATALOG_FILE, parsed);
  }
  return parsed;
}

export async function savePreconDeck(deck: PreconDeck): Promise<PreconCatalog> {
  const catalog = await getPreconCatalog();
  const next = {
    updatedAt: new Date().toISOString(),
    decks: [deck, ...catalog.decks.filter((row) => row.id !== deck.id)],
  };
  const parsed = preconCatalogSchema.parse(next);
  await writeJson(PRECON_CATALOG_FILE, parsed);
  return parsed;
}

export async function getPreconHarvestBook(): Promise<PreconHarvestBook> {
  const raw = await readJson<PreconHarvestBook>(PRECON_HARVEST_FILE, emptyPreconHarvestBook());
  try {
    const parsed = preconHarvestBookSchema.parse(raw);
    if (parsed.harvestedAt) return parsed;
  } catch {
    /* seed below */
  }
  const catalog = await getPreconCatalog();
  const seeded = buildMockPreconHarvest(catalog.decks, "2026-09-21T01:00:00.000Z");
  await writeJson(PRECON_HARVEST_FILE, seeded);
  return seeded;
}

export async function savePreconHarvestBook(book: PreconHarvestBook): Promise<PreconHarvestBook> {
  const parsed = preconHarvestBookSchema.parse(book);
  await writeJson(PRECON_HARVEST_FILE, parsed);
  return parsed;
}

export async function refreshMockPreconHarvest(): Promise<PreconHarvestBook> {
  const catalog = await getPreconCatalog();
  const book = buildMockPreconHarvest(catalog.decks, new Date().toISOString());
  return savePreconHarvestBook(book);
}

const HARVEST_DIFF_FILE = path.join("mtg-buylist", "playmantis-harvest-diff.json");

export async function savePlaymantisHarvestDiff(
  rows: PlaymantisHarvestDiffRow[],
): Promise<number> {
  if (!rows.length) return 0;
  if (postgresEnabled()) await pgInsertPlaymantisHarvestDiff(rows);
  const existing = await readJson<PlaymantisHarvestDiffRow[]>(HARVEST_DIFF_FILE, []);
  existing.push(...rows);
  await persistSimpleJson(HARVEST_DIFF_FILE, existing);
  return rows.length;
}

export async function listPlaymantisHarvestDiff(
  userKey?: string,
): Promise<PlaymantisHarvestDiffRow[]> {
  const raw = postgresEnabled()
    ? await pgListPlaymantisHarvestDiff(200, userKey)
    : [...(await readJson<PlaymantisHarvestDiffRow[]>(HARVEST_DIFF_FILE, []))]
        .filter((row) => !userKey || row.userKey === userKey)
        .reverse()
        .slice(0, 200);
  return raw.map((row) => ({ ...row, lookedAt: row.lookedAt || "" }));
}

export async function clearPlaymantisHarvestDiff(userKey?: string): Promise<number> {
  if (postgresEnabled()) {
    const cleared = await pgClearPlaymantisHarvestDiff(userKey);
    if (!userKey) await persistSimpleJson(HARVEST_DIFF_FILE, []);
    else {
      const existing = await readJson<PlaymantisHarvestDiffRow[]>(HARVEST_DIFF_FILE, []);
      await persistSimpleJson(
        HARVEST_DIFF_FILE,
        existing.filter((row) => row.userKey !== userKey),
      );
    }
    return cleared;
  }
  const existing = await readJson<PlaymantisHarvestDiffRow[]>(HARVEST_DIFF_FILE, []);
  const keep = userKey ? existing.filter((row) => row.userKey !== userKey) : [];
  const cleared = existing.length - keep.length;
  await persistSimpleJson(HARVEST_DIFF_FILE, keep);
  return cleared;
}

export async function markPlaymantisHarvestDiffLookedAt(ids: string[]): Promise<number> {
  const want = new Set(ids.filter(Boolean));
  if (!want.size) return 0;
  const now = new Date().toISOString();
  if (postgresEnabled()) await pgMarkPlaymantisHarvestDiffLookedAt([...want]);
  const existing = await readJson<PlaymantisHarvestDiffRow[]>(HARVEST_DIFF_FILE, []);
  let marked = 0;
  const next = existing.map((row) => {
    if (!want.has(row.id) || row.lookedAt) return row;
    marked += 1;
    return { ...row, lookedAt: now };
  });
  await persistSimpleJson(HARVEST_DIFF_FILE, next);
  return postgresEnabled() ? want.size : marked;
}

function ideaRowForDisk(idea: KanbanInboxNote): KanbanInboxNote {
  const note = normalizeInboxNote(idea);
  return {
    id: note.id,
    nodeId: note.nodeId,
    title: note.title,
    body: note.body,
    status: note.status,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    copiedAt: note.copiedAt ?? null,
    kind: note.kind,
    source: note.source,
    pageHref: note.pageHref ?? null,
    pageTitle: note.pageTitle ?? null,
    submittedBy: note.submittedBy ?? null,
  };
}

function metaFromIdeaAttachments(
  rows: KanbanAttachmentStoreRow[],
  ideaId: string,
): KanbanAttachmentMeta[] {
  return rows
    .filter((row) => row.ideaId === ideaId)
    .map((row) => ({
      id: row.id,
      filename: row.filename,
      mimeType: row.mimeType,
      byteSize: row.byteSize,
      createdAt: row.createdAt,
    }));
}

async function loadAttachmentRowsFromJson(): Promise<KanbanAttachmentStoreRow[]> {
  const raw = await readJsonIfExists(path.join("kanban", "attachments.json"));
  if (!Array.isArray(raw)) return [];
  const out: KanbanAttachmentStoreRow[] = [];
  for (const row of raw) {
    const parsed = kanbanAttachmentStoreRowSchema.safeParse(row);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

async function loadAttachmentRows(): Promise<KanbanAttachmentStoreRow[]> {
  if (postgresEnabled()) return pgGetKanbanAttachmentMeta();
  return loadAttachmentRowsFromJson();
}

async function persistAttachmentMeta(rows: KanbanAttachmentStoreRow[]): Promise<void> {
  if (!postgresEnabled() || dualWriteJson()) {
    await writeJson(path.join("kanban", "attachments.json"), rows);
  }
}

function attachmentBinPath(id: string): string {
  return path.join(dataDir, "kanban", "attachments", `${id}.bin`);
}

function kanbanRowFile(name: "ideas.json" | "tickets.json" | "meta.json") {
  return path.join("kanban", name);
}

type KanbanRowBundle = {
  ideas: KanbanInboxNote[];
  tickets: KanbanTicket[];
  meta: KanbanMeta[];
};

async function readJsonIfExists<T>(file: string): Promise<T | null> {
  const full = path.join(dataDir, file);
  try {
    const raw = await fs.readFile(full, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function parseKanbanIdeas(raw: unknown): KanbanInboxNote[] {
  if (!Array.isArray(raw)) return [];
  const out: KanbanInboxNote[] = [];
  for (const row of raw) {
    const parsed = kanbanInboxNoteSchema.safeParse(row);
    if (parsed.success) out.push(normalizeInboxNote(parsed.data));
  }
  return out;
}

function parseKanbanTickets(raw: unknown): KanbanTicket[] {
  if (!Array.isArray(raw)) return [];
  const out: KanbanTicket[] = [];
  for (const row of raw) {
    const parsed = kanbanTicketSchema.safeParse(row);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

function parseKanbanMeta(raw: unknown): KanbanMeta[] {
  if (!Array.isArray(raw)) return [];
  const out: KanbanMeta[] = [];
  for (const row of raw) {
    const parsed = kanbanMetaSchema.safeParse(row);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

function metaFromBoard(board: KanbanBoard): KanbanMeta {
  return {
    nodeId: board.nodeId,
    revision: board.revision,
    updatedAt: board.updatedAt,
    publishedAt: board.publishedAt,
    liveBaseline: board.liveBaseline,
    events: board.events,
    lanes: board.lanes,
  };
}

function upsertRow<T extends { id: string }>(rows: T[], next: T) {
  const idx = rows.findIndex((row) => row.id === next.id);
  if (idx >= 0) rows[idx] = next;
  else rows.push(next);
}

function upsertMeta(rows: KanbanMeta[], next: KanbanMeta) {
  const idx = rows.findIndex((row) => row.nodeId === next.nodeId);
  if (idx >= 0) rows[idx] = next;
  else rows.push(next);
}

function bumpKanbanMeta(
  bundle: KanbanRowBundle,
  nodeId: string,
  event?: KanbanEvent,
): KanbanMeta {
  const now = new Date().toISOString();
  const current =
    bundle.meta.find((row) => row.nodeId === nodeId) ?? emptyKanbanMeta(nodeId);
  const next: KanbanMeta = {
    ...current,
    revision: current.revision + 1,
    updatedAt: now,
    events: event ? prependEvent(current.events, event) : current.events,
  };
  upsertMeta(bundle.meta, next);
  return next;
}

async function listLegacyKanbanFiles(): Promise<string[]> {
  const dir = path.join(dataDir, "kanban");
  try {
    const names = await fs.readdir(dir);
    return names.filter((name) => {
      if (!name.endsWith(".json")) return false;
      return name !== "ideas.json" && name !== "tickets.json" && name !== "meta.json";
    });
  } catch {
    return [];
  }
}

async function migrateLegacyKanbanBoards(
  bundle: KanbanRowBundle,
): Promise<boolean> {
  const files = await listLegacyKanbanFiles();
  let added = false;
  const ideaIds = new Set(bundle.ideas.map((row) => row.id));
  const ticketIds = new Set(bundle.tickets.map((row) => row.id));
  const metaIds = new Set(bundle.meta.map((row) => row.nodeId));
  for (const name of files) {
    const nodeGuess = name.replace(/\.json$/, "");
    const raw = await readJsonIfExists(path.join("kanban", name));
    if (raw == null) continue;
    const board = boardFromUnknown(nodeGuess, raw);
    for (const idea of board.ideas) {
      if (ideaIds.has(idea.id)) continue;
      bundle.ideas.push(idea);
      ideaIds.add(idea.id);
      added = true;
    }
    for (const ticket of board.tickets) {
      if (ticketIds.has(ticket.id)) continue;
      bundle.tickets.push(ticket);
      ticketIds.add(ticket.id);
      added = true;
    }
    if (!metaIds.has(board.nodeId)) {
      bundle.meta.push(metaFromBoard(board));
      metaIds.add(board.nodeId);
      added = true;
    }
  }
  return added;
}

function applyKanbanSeedToBundle(bundle: KanbanRowBundle): boolean {
  const missing = missingKanbanSeed({
    ideaIds: new Set(bundle.ideas.map((row) => row.id)),
    ticketIds: new Set(bundle.tickets.map((row) => row.id)),
  });
  let changed = missing.ideas.length > 0 || missing.tickets.length > 0;
  if (changed) {
    const now = new Date().toISOString();
    bundle.ideas.push(...missing.ideas.map((row) => normalizeInboxNote(row)));
    bundle.tickets.push(...missing.tickets);
    const nodeIds = new Set<string>();
    for (const idea of missing.ideas) nodeIds.add(idea.nodeId);
    for (const ticket of missing.tickets) nodeIds.add(ticket.nodeId);
    for (const nodeId of nodeIds) {
      const current =
        bundle.meta.find((row) => row.nodeId === nodeId) ?? emptyKanbanMeta(nodeId);
      upsertMeta(bundle.meta, {
        ...current,
        revision: current.revision + 1,
        updatedAt: now,
        events: prependEvent(current.events, {
          at: now,
          kind: "inbox",
          summary: `Seeded ${missing.ideas.filter((i) => i.nodeId === nodeId).length} inbox note(s) and ${missing.tickets.filter((t) => t.nodeId === nodeId).length} ticket(s) from the live zip.`,
        }),
      });
    }
  }
  if (applyKanbanHygiene(bundle)) changed = true;
  return changed;
}

const KNOWN_FEEDBACK_IDEA_IDS = new Set(["IN-20260908-04", "IN-20260908-05"]);

function feedbackRecordToInbox(row: FeedbackRecord): KanbanInboxNote {
  const firstLine = row.message.split(/\r?\n/)[0]?.trim() || row.pageTitle || "Feedback";
  return normalizeInboxNote({
    id: row.id,
    nodeId: defaultKanbanNodeIdFromHref(row.pageHref),
    title: firstLine.slice(0, 120),
    body: row.message,
    status: row.status === "done" ? "archived" : "open",
    createdAt: row.createdAt,
    updatedAt: row.createdAt,
    copiedAt: null,
    kind: row.kind,
    source: "feedback",
    pageHref: row.pageHref,
    pageTitle: row.pageTitle,
    submittedBy: row.submittedBy,
  });
}

export function inboxNoteToFeedbackRecord(note: KanbanInboxNote): FeedbackRecord {
  const normalized = normalizeInboxNote(note);
  return {
    id: normalized.id,
    createdAt: normalized.createdAt,
    kind: normalized.kind ?? "idea",
    status: normalized.status === "archived" ? "done" : "open",
    pageHref: normalized.pageHref || "/",
    pageTitle: normalized.pageTitle || "",
    message: normalized.body,
    submittedBy: normalized.submittedBy || "",
  };
}

async function loadLegacyFeedbackRows(): Promise<FeedbackRecord[]> {
  if (postgresEnabled()) return pgGetFeedback();
  const raw = await readJsonIfExists<FeedbackRecord[]>("feedback.json");
  return Array.isArray(raw) ? raw : [];
}

function applyInboxUnifyToBundle(
  bundle: KanbanRowBundle,
  legacyFeedback: FeedbackRecord[],
): boolean {
  let changed = false;
  const ids = new Set(bundle.ideas.map((row) => row.id));
  for (const row of legacyFeedback) {
    if (ids.has(row.id)) continue;
    bundle.ideas.push(feedbackRecordToInbox(row));
    ids.add(row.id);
    changed = true;
  }
  for (const idea of bundle.ideas) {
    if (KNOWN_FEEDBACK_IDEA_IDS.has(idea.id) && idea.source !== "feedback") {
      idea.source = "feedback";
      changed = true;
    }
  }
  return changed;
}

function assembleKanbanBoard(
  nodeId: string,
  bundle: KanbanRowBundle,
  attachments: KanbanAttachmentStoreRow[],
): KanbanBoard {
  const meta =
    bundle.meta.find((row) => row.nodeId === nodeId) ?? emptyKanbanMeta(nodeId);
  const ideas = bundle.ideas
    .filter((row) => row.nodeId === nodeId)
    .map((idea) => ({
      ...idea,
      attachments: metaFromIdeaAttachments(attachments, idea.id),
    }));
  return boardFromRows(nodeId, ideas, bundle.tickets.filter((row) => row.nodeId === nodeId), meta);
}

async function loadKanbanFromJsonFiles(): Promise<{
  bundle: KanbanRowBundle;
  dirty: boolean;
}> {
  const bundle: KanbanRowBundle = {
    ideas: parseKanbanIdeas(await readJsonIfExists(kanbanRowFile("ideas.json"))),
    tickets: parseKanbanTickets(await readJsonIfExists(kanbanRowFile("tickets.json"))),
    meta: parseKanbanMeta(await readJsonIfExists(kanbanRowFile("meta.json"))),
  };
  const migrated = await migrateLegacyKanbanBoards(bundle);
  const seeded = applyKanbanSeedToBundle(bundle);
  const unified = applyInboxUnifyToBundle(bundle, await loadLegacyFeedbackRows());
  return { bundle, dirty: migrated || seeded || unified };
}

async function persistKanbanBundle(bundle: KanbanRowBundle): Promise<void> {
  if (postgresEnabled()) {
    for (const row of bundle.ideas) await pgUpsertKanbanIdea(row);
    for (const row of bundle.tickets) await pgUpsertKanbanTicket(row);
    for (const row of bundle.meta) await pgUpsertKanbanMeta(row);
  }
  await persistSimpleJson(
    kanbanRowFile("ideas.json"),
    bundle.ideas.map(ideaRowForDisk),
  );
  await persistSimpleJson(kanbanRowFile("tickets.json"), bundle.tickets);
  await persistSimpleJson(kanbanRowFile("meta.json"), bundle.meta);
}

let kanbanLoad: Promise<KanbanRowBundle> | null = null;

async function loadKanbanRows(): Promise<KanbanRowBundle> {
  if (!kanbanLoad) {
    kanbanLoad = (async () => {
      if (postgresEnabled()) {
        const ideas = await pgGetKanbanIdeas();
        const tickets = await pgGetKanbanTickets();
        const meta = await pgGetKanbanMeta();
        if (ideas.length === 0 && tickets.length === 0) {
          const fromJson = await loadKanbanFromJsonFiles();
          if (fromJson.bundle.ideas.length || fromJson.bundle.tickets.length) {
            await persistKanbanBundle(fromJson.bundle);
          }
          return fromJson.bundle;
        }
        const bundle = { ideas, tickets, meta };
        const seeded = applyKanbanSeedToBundle(bundle);
        const unified = applyInboxUnifyToBundle(bundle, await loadLegacyFeedbackRows());
        if (seeded || unified) await persistKanbanBundle(bundle);
        return bundle;
      }
      const fromJson = await loadKanbanFromJsonFiles();
      if (fromJson.dirty) await persistKanbanBundle(fromJson.bundle);
      return fromJson.bundle;
    })().finally(() => {
      kanbanLoad = null;
    });
  }
  return kanbanLoad;
}

export async function getKanbanBoard(nodeId: string): Promise<KanbanBoard> {
  const bundle = await loadKanbanRows();
  const attachments = await loadAttachmentRows();
  return assembleKanbanBoard(nodeId, bundle, attachments);
}

export async function getKanbanAllBoard(): Promise<KanbanBoard> {
  const bundle = await loadKanbanRows();
  const attachments = await loadAttachmentRows();
  const globalMeta =
    bundle.meta.find((row) => row.nodeId === KANBAN_GLOBAL_NODE_ID) ??
    emptyKanbanMeta(KANBAN_GLOBAL_NODE_ID);
  const revision = bundle.meta.reduce(
    (max, row) => Math.max(max, row.revision),
    globalMeta.revision,
  );
  const ideas = bundle.ideas.map((idea) => ({
    ...idea,
    attachments: metaFromIdeaAttachments(attachments, idea.id),
  }));
  return boardFromRows(KANBAN_GLOBAL_NODE_ID, ideas, bundle.tickets, {
    ...globalMeta,
    revision,
  });
}

export async function saveKanbanBoard(board: KanbanBoard): Promise<void> {
  const bundle = await loadKanbanRows();
  for (const idea of board.ideas) upsertRow(bundle.ideas, ideaRowForDisk(idea));
  for (const ticket of board.tickets) upsertRow(bundle.tickets, ticket);
  upsertMeta(bundle.meta, metaFromBoard(board));
  await persistKanbanBundle(bundle);
}

type LeafNotesFile = Record<string, { body: string; updatedAt: string }>;

export async function getKanbanLeafNotes(nodeId: string): Promise<string> {
  if (postgresEnabled()) return pgGetKanbanLeafNote(nodeId);
  const all = await readJson("kanban/leaf-notes.json", {} as LeafNotesFile);
  return all[nodeId]?.body ?? "";
}

export async function saveKanbanLeafNotes(nodeId: string, body: string): Promise<void> {
  const updatedAt = new Date().toISOString();
  if (postgresEnabled()) await pgUpsertKanbanLeafNote(nodeId, body, updatedAt);
  if (!postgresEnabled() || dualWriteJson()) {
    const all = await readJson("kanban/leaf-notes.json", {} as LeafNotesFile);
    all[nodeId] = { body, updatedAt };
    await persistSimpleJson("kanban/leaf-notes.json", all);
  }
}

export async function upsertKanbanIdea(idea: KanbanInboxNote): Promise<void> {
  const bundle = await loadKanbanRows();
  upsertRow(bundle.ideas, ideaRowForDisk(idea));
  bumpKanbanMeta(bundle, idea.nodeId, {
    at: idea.updatedAt,
    kind: "inbox",
    summary: `Saved raw ${idea.id}`,
  });
  await persistKanbanBundle(bundle);
  await retagKanbanAttachments(idea.id, idea.nodeId);
}

export async function upsertKanbanTicket(ticket: KanbanTicket): Promise<void> {
  const bundle = await loadKanbanRows();
  upsertRow(bundle.tickets, ticket);
  bumpKanbanMeta(bundle, ticket.nodeId, {
    at: ticket.updatedAt,
    kind: "pack",
    summary: `Saved ${ticket.id}`,
  });
  await persistKanbanBundle(bundle);
}

export async function getKanbanIdeaById(
  id: string,
): Promise<KanbanInboxNote | null> {
  const bundle = await loadKanbanRows();
  const idea = bundle.ideas.find((row) => row.id === id);
  if (!idea) return null;
  const attachments = await loadAttachmentRows();
  return { ...idea, attachments: metaFromIdeaAttachments(attachments, idea.id) };
}

export async function listKanbanIdeas(): Promise<KanbanInboxNote[]> {
  const bundle = await loadKanbanRows();
  return bundle.ideas.slice();
}

export async function listKanbanAttachmentMeta(): Promise<KanbanAttachmentStoreRow[]> {
  return loadAttachmentRows();
}

export async function getKanbanAttachment(
  id: string,
): Promise<{ meta: KanbanAttachmentStoreRow; bytes: Buffer } | null> {
  if (postgresEnabled()) return pgGetKanbanAttachment(id);
  const rows = await loadAttachmentRows();
  const meta = rows.find((row) => row.id === id);
  if (!meta) return null;
  try {
    const bytes = await fs.readFile(attachmentBinPath(id));
    return { meta, bytes };
  } catch {
    return null;
  }
}

export async function addKanbanAttachment(input: {
  ideaId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<KanbanAttachmentStoreRow> {
  const idea = await getKanbanIdeaById(input.ideaId);
  if (!idea) throw new Error("Inbox note not found");
  const existing = (await loadAttachmentRows()).filter((row) => row.ideaId === input.ideaId);
  if (existing.length >= ATTACHMENT_MAX_PER_NOTE) {
    throw new Error(`At most ${ATTACHMENT_MAX_PER_NOTE} files per note`);
  }
  if (input.bytes.length > ATTACHMENT_MAX_BYTES) {
    throw new Error("File is over 8 MB");
  }
  const row: KanbanAttachmentStoreRow = {
    id: newAttachmentId(),
    ideaId: idea.id,
    nodeId: idea.nodeId,
    filename: safeFilename(input.filename),
    mimeType: input.mimeType,
    byteSize: input.bytes.length,
    createdAt: new Date().toISOString(),
  };
  if (postgresEnabled()) {
    await pgInsertKanbanAttachment(row, input.bytes);
  }
  if (!postgresEnabled() || dualWriteJson()) {
    const rows = await loadAttachmentRowsFromJson();
    if (!rows.some((item) => item.id === row.id)) rows.push(row);
    await persistAttachmentMeta(rows);
    await fs.mkdir(path.dirname(attachmentBinPath(row.id)), { recursive: true });
    await fs.writeFile(attachmentBinPath(row.id), input.bytes);
  }
  return row;
}

export async function deleteKanbanAttachment(id: string): Promise<boolean> {
  const existing = await getKanbanAttachment(id);
  if (!existing) return false;
  if (postgresEnabled()) await pgDeleteKanbanAttachment(id);
  if (!postgresEnabled() || dualWriteJson()) {
    const rows = (await loadAttachmentRowsFromJson()).filter((row) => row.id !== id);
    await persistAttachmentMeta(rows);
    try {
      await fs.unlink(attachmentBinPath(id));
    } catch {
      // bin already gone
    }
  }
  return true;
}

export async function retagKanbanAttachments(ideaId: string, nodeId: string): Promise<void> {
  if (postgresEnabled()) await pgRetagKanbanAttachments(ideaId, nodeId);
  if (!postgresEnabled() || dualWriteJson()) {
    const rows = await loadAttachmentRowsFromJson();
    let changed = false;
    for (const row of rows) {
      if (row.ideaId === ideaId && row.nodeId !== nodeId) {
        row.nodeId = nodeId;
        changed = true;
      }
    }
    if (changed) await persistAttachmentMeta(rows);
  }
}

export async function upsertChangelogEntries(
  entries: ChangelogEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  const all = await getChangelogs();
  const byId = new Map(all.map((row) => [row.id, row]));
  for (const entry of entries) byId.set(entry.id, entry);
  const out = Array.from(byId.values());
  if (postgresEnabled()) await pgReplaceChangelogs(out);
  await persistSimpleJson("changelogs.json", out);
}

export type MateHarvestToken = {
  userKey: string;
  runId?: string;
  setCodes: string[];
  expiresAt: string;
};

type MateHarvestTokenFile = {
  tokens: Record<string, MateHarvestToken>;
};

export async function saveMateHarvestToken(
  token: string,
  record: MateHarvestToken,
): Promise<void> {
  const all = await readJson("mtg-buylist-tokens.json", {
    tokens: {},
  } as MateHarvestTokenFile);
  const now = Date.now();
  for (const [key, value] of Object.entries(all.tokens)) {
    if (Date.parse(value.expiresAt) < now) delete all.tokens[key];
  }
  all.tokens[token] = record;
  await writeJson("mtg-buylist-tokens.json", all);
}

export async function consumeMateHarvestToken(
  token: string,
): Promise<MateHarvestToken | null> {
  const all = await readJson("mtg-buylist-tokens.json", {
    tokens: {},
  } as MateHarvestTokenFile);
  const record = all.tokens[token];
  if (!record) return null;
  if (Date.parse(record.expiresAt) < Date.now()) {
    delete all.tokens[token];
    await writeJson("mtg-buylist-tokens.json", all);
    return null;
  }
  return record;
}

export async function addFeedback(
  entry: Omit<FeedbackRecord, "id" | "createdAt" | "status"> & { nodeId?: string },
): Promise<FeedbackRecord> {
  const all = await listKanbanIdeas();
  const now = new Date().toISOString();
  const firstLine = entry.message.split(/\r?\n/)[0]?.trim() || entry.pageTitle || "Feedback";
  const nodeId = entry.nodeId
    ? entry.nodeId
    : defaultKanbanNodeIdFromHref(entry.pageHref);
  const note: KanbanInboxNote = normalizeInboxNote({
    id: nextInboxId(all),
    nodeId,
    title: firstLine.slice(0, 120),
    body: entry.message,
    status: "open",
    createdAt: now,
    updatedAt: now,
    copiedAt: null,
    kind: entry.kind,
    source: "feedback",
    pageHref: entry.pageHref,
    pageTitle: entry.pageTitle,
    submittedBy: entry.submittedBy,
  });
  await upsertKanbanIdea(note);
  return inboxNoteToFeedbackRecord(note);
}

async function appendDevChoicesDoc(record: DevChoiceRecord) {
  const lines = [
    ``,
    `### \`${record.id}\` — ${record.layer} (${record.status})`,
    ``,
    `**Decision:** ${record.decision}`,
  ];
  const why = record.why?.trim();
  if (why) lines.push(``, `**Why:** ${why}`);
  lines.push(``);
  const block = lines.join("\n");

  try {
    await fs.mkdir(path.dirname(devChoicesPath), { recursive: true });
    try {
      await fs.access(devChoicesPath);
    } catch {
      await fs.writeFile(
        devChoicesPath,
        `# Development choices\n\nCanon for agents and humans. Do not contradict **locked** rows. In-app: Internal → Development choices (\`/i/dev-choices\`). Store: \`data/dev-choices.json\`.\n\n---\n`,
        "utf8",
      );
    }
    const existing = await fs.readFile(devChoicesPath, "utf8");
    await fs.writeFile(devChoicesPath, `${existing.trimEnd()}\n${block}`, "utf8");
  } catch {
    // Azure ephemeral FS may block docs writes — register JSON still saved when possible
  }
}
