import { promises as fs } from "fs";
import path from "path";
import {
  seedChangelogs,
  seedDependencies,
  seedIdeas,
  seedNotes,
} from "@/core/registry/seed";
import type {
  ChangelogEntry,
  DependencyRecord,
  FeedbackRecord,
  IdeaRecord,
  NoteRecord,
} from "@/core/contracts/types";
import {
  emptyScheduleStore,
  scheduleStoreSchema,
  type ScheduleStore,
} from "@/modules/sunwater-mrt/schema";

const dataDir = path.join(process.cwd(), "data");
const inboxPath = path.join(process.cwd(), "docs", "feedback-inbox.md");

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
  await fs.writeFile(
    path.join(dataDir, file),
    JSON.stringify(value, null, 2),
    "utf8",
  );
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
    } else if (current.title !== seeded.title || current.body !== seeded.body) {
      byId.set(seeded.id, { ...current, title: seeded.title, body: seeded.body });
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

export async function getSunwaterMrtStore(): Promise<ScheduleStore> {
  const fallback = emptyScheduleStore();
  const raw = await readJson("sunwater-mrt.json", fallback);
  const parsed = scheduleStoreSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  await writeJson("sunwater-mrt.json", fallback);
  return fallback;
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
