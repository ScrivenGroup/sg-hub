import { promises as fs } from "fs";
import path from "path";
import {
  seedChangelogs,
  seedDependencies,
  seedDevChoices,
  seedIdeas,
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
  emptyScheduleStore,
  scheduleStoreSchema,
  type ScheduleStore,
} from "@/modules/sunwater-mrt/schema";
import { normalizeScheduleStore } from "@/modules/sunwater-mrt/logic/normalize-store";
import type { MrtGuestActivity } from "@/modules/sunwater-mrt/share-public";

const dataDir = path.join(process.cwd(), "data");
const inboxPath = path.join(process.cwd(), "docs", "feedback-inbox.md");
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

export async function getDependencies(): Promise<DependencyRecord[]> {
  return readJson("dependencies.json", seedDependencies);
}

export async function getChangelogs(): Promise<ChangelogEntry[]> {
  const existing = await readJson("changelogs.json", seedChangelogs);
  const byId = new Map(existing.map((c) => [c.id, c]));
  let changed = false;
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
    await writeJson("changelogs.json", out);
  }
  return out;
}

export async function getChangelogsForNode(
  nodeId: string,
): Promise<ChangelogEntry[]> {
  const all = await getChangelogs();
  return all.filter((c) => c.nodeId === nodeId);
}

export async function getIdeas(): Promise<IdeaRecord[]> {
  return readJson("ideas.json", seedIdeas);
}

export async function getNotes(): Promise<NoteRecord[]> {
  return readJson("notes.json", seedNotes);
}

export async function getFeedback(): Promise<FeedbackRecord[]> {
  return readJson("feedback.json", [] as FeedbackRecord[]);
}

export async function getDevChoices(): Promise<DevChoiceRecord[]> {
  const existing = await readJson("dev-choices.json", seedDevChoices);
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
    await writeJson("dev-choices.json", out);
  }
  return out;
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
  await writeJson("dev-choices.json", all);
  await appendDevChoicesDoc(record);
  return record;
}

export async function getSunwaterMrtStore(): Promise<ScheduleStore> {
  const fallback = emptyScheduleStore();
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
  await writeJson("sunwater-mrt.json", parsed);
}

export async function addFeedback(
  entry: Omit<FeedbackRecord, "id" | "createdAt" | "status">,
): Promise<FeedbackRecord> {
  const all = await getFeedback();
  const record: FeedbackRecord = {
    ...entry,
    id: `fb-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    status: "open",
  };
  all.unshift(record);
  await writeJson("feedback.json", all);
  await appendFeedbackInbox(record);
  return record;
}

async function appendFeedbackInbox(record: FeedbackRecord) {
  const block = [
    ``,
    `## ${record.kind.toUpperCase()} — ${record.pageTitle || record.pageHref}`,
    `- id: \`${record.id}\``,
    `- when: ${record.createdAt}`,
    `- page: ${record.pageHref}`,
    `- by: ${record.submittedBy}`,
    `- status: ${record.status}`,
    ``,
    record.message,
    ``,
    `---`,
    ``,
  ].join("\n");

  try {
    await fs.mkdir(path.dirname(inboxPath), { recursive: true });
    try {
      await fs.access(inboxPath);
    } catch {
      await fs.writeFile(
        inboxPath,
        `# Feedback inbox\n\nOpen items for Cursor housekeeping / bug-fix sessions. Newest first.\n\n---\n`,
        "utf8",
      );
    }
    const existing = await fs.readFile(inboxPath, "utf8");
    // Insert after the header separator
    const marker = "---\n";
    const idx = existing.indexOf(marker);
    if (idx >= 0) {
      const head = existing.slice(0, idx + marker.length);
      const tail = existing.slice(idx + marker.length);
      await fs.writeFile(inboxPath, `${head}${block}${tail}`, "utf8");
    } else {
      await fs.writeFile(inboxPath, `${existing}\n${block}`, "utf8");
    }
  } catch {
    // Azure ephemeral FS may block docs writes — register JSON still saved when possible
  }
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
