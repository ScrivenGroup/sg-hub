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
  IdeaRecord,
  NoteRecord,
} from "@/core/contracts/types";

const dataDir = path.join(process.cwd(), "data");

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

export async function getDependencies(): Promise<DependencyRecord[]> {
  return readJson("dependencies.json", seedDependencies);
}

export async function getChangelogs(): Promise<ChangelogEntry[]> {
  return readJson("changelogs.json", seedChangelogs);
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
