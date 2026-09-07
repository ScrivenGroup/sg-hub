import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import {
  MRT_SHARE_DURATIONS,
  type MrtAudienceSharePublic,
} from "@/modules/sunwater-mrt/share-public";
import {
  pgGetMrtShares,
  pgReplaceMrtShares,
  postgresEnabled,
} from "@/core/store/simple-pg";

export { MRT_SHARE_DURATIONS, type MrtAudienceSharePublic };

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;
const MAX_SHARES = 20;
const FILE = "mrt-share.json";
const dataDir = path.join(process.cwd(), "data");

export type MrtAudienceShare = {
  id: string;
  audience: string;
  enabled: boolean;
  passwordHash: string;
  salt: string;
  /** AES-GCM vault: iv:tag:ciphertext (hex). Staff reveal only. */
  passwordVault?: string;
  expiresAt: string;
  updatedAt: string;
};

function vaultKey(): Buffer {
  const secret = process.env.AUTH_SECRET || "";
  return createHash("sha256").update(`mrt-share-vault:${secret}`).digest();
}

function sealPassword(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

function openPassword(vault: string): string | null {
  const parts = vault.split(":");
  if (parts.length !== 3) return null;
  const [ivHex, tagHex, dataHex] = parts;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      vaultKey(),
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return plain.toString("utf8");
  } catch {
    return null;
  }
}

type ShareFile = { shares: MrtAudienceShare[] };

function emptyFile(): ShareFile {
  return { shares: [] };
}

async function readFile(): Promise<ShareFile> {
  await fs.mkdir(dataDir, { recursive: true });
  const full = path.join(dataDir, FILE);
  try {
    const raw = await fs.readFile(full, "utf8");
    const parsed = JSON.parse(raw) as ShareFile;
    if (!parsed || !Array.isArray(parsed.shares)) return emptyFile();
    return { shares: parsed.shares.filter((s) => s && typeof s.id === "string") };
  } catch {
    const fallback = emptyFile();
    await fs.writeFile(full, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

async function writeFile(value: ShareFile): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    path.join(dataDir, FILE),
    JSON.stringify(value, null, 2),
    "utf8",
  );
}

async function loadShares(): Promise<ShareFile> {
  if (postgresEnabled()) {
    return { shares: await pgGetMrtShares() };
  }
  return readFile();
}

async function saveShares(value: ShareFile): Promise<void> {
  if (postgresEnabled()) {
    await pgReplaceMrtShares(value.shares);
    return;
  }
  await writeFile(value);
}

function toPublic(row: MrtAudienceShare): MrtAudienceSharePublic {
  return {
    id: row.id,
    audience: row.audience,
    enabled: row.enabled,
    expiresAt: row.expiresAt,
    updatedAt: row.updatedAt,
    hasVault: Boolean(row.passwordVault),
  };
}

export function shareVFromHash(hash: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < hash.length; i++) {
    h ^= hash.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return derived.toString("hex");
}

async function passwordsMatch(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  const derived = Buffer.from(await hashPassword(password, salt), "hex");
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function shareIsLive(row: MrtAudienceShare, now = Date.now()): boolean {
  if (!row.enabled) return false;
  if (!row.passwordHash || !row.salt) return false;
  const exp = Date.parse(row.expiresAt);
  return Number.isFinite(exp) && now < exp;
}

export async function listMrtSharesPublic(): Promise<MrtAudienceSharePublic[]> {
  const file = await loadShares();
  return file.shares.map(toPublic);
}

export async function getMrtShareById(
  id: string,
): Promise<MrtAudienceShare | null> {
  if (!id) return null;
  const file = await loadShares();
  return file.shares.find((s) => s.id === id) ?? null;
}

export async function anyMrtShareActive(): Promise<boolean> {
  const file = await loadShares();
  const now = Date.now();
  return file.shares.some((s) => shareIsLive(s, now));
}

export async function guestShareStillValid(
  shareId: string | undefined,
  shareV: string | undefined,
): Promise<boolean> {
  if (!shareId || !shareV) return false;
  const row = await getMrtShareById(shareId);
  if (!row || !shareIsLive(row)) return false;
  return shareVFromHash(row.passwordHash) === shareV;
}

export async function createMrtShare(input: {
  audience: string;
  password: string;
  durationHours: number;
}): Promise<{ ok: true; share: MrtAudienceSharePublic } | { ok: false; error: string }> {
  const audience = input.audience.trim().slice(0, 80);
  if (!audience) return { ok: false, error: "Audience name is required" };
  if (input.password.length < 4) {
    return { ok: false, error: "Password must be at least 4 characters" };
  }
  const hours = Number(input.durationHours);
  if (!MRT_SHARE_DURATIONS.some((d) => d.hours === hours)) {
    return { ok: false, error: "Pick a duration" };
  }

  const file = await loadShares();
  if (file.shares.length >= MAX_SHARES) {
    return { ok: false, error: `At most ${MAX_SHARES} audiences` };
  }

  const salt = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(input.password, salt);
  const now = new Date();
  const row: MrtAudienceShare = {
    id: randomBytes(8).toString("hex"),
    audience,
    enabled: true,
    passwordHash,
    salt,
    passwordVault: sealPassword(input.password),
    expiresAt: new Date(now.getTime() + hours * 3600 * 1000).toISOString(),
    updatedAt: now.toISOString(),
  };
  file.shares.unshift(row);
  await saveShares(file);
  return { ok: true, share: toPublic(row) };
}

export async function setMrtSharePassword(input: {
  id: string;
  password: string;
  durationHours?: number;
}): Promise<{ ok: true; share: MrtAudienceSharePublic } | { ok: false; error: string }> {
  if (input.password.length < 4) {
    return { ok: false, error: "Password must be at least 4 characters" };
  }
  const file = await loadShares();
  const row = file.shares.find((s) => s.id === input.id);
  if (!row) return { ok: false, error: "Audience not found" };

  const salt = randomBytes(16).toString("hex");
  row.salt = salt;
  row.passwordHash = await hashPassword(input.password, salt);
  row.passwordVault = sealPassword(input.password);
  row.enabled = true;
  const now = new Date();
  if (input.durationHours != null) {
    const hours = Number(input.durationHours);
    if (!MRT_SHARE_DURATIONS.some((d) => d.hours === hours)) {
      return { ok: false, error: "Pick a duration" };
    }
    row.expiresAt = new Date(now.getTime() + hours * 3600 * 1000).toISOString();
  }
  row.updatedAt = now.toISOString();
  await saveShares(file);
  return { ok: true, share: toPublic(row) };
}

export async function disableMrtShare(
  id: string,
): Promise<{ ok: true; share: MrtAudienceSharePublic } | { ok: false; error: string }> {
  const file = await loadShares();
  const row = file.shares.find((s) => s.id === id);
  if (!row) return { ok: false, error: "Audience not found" };
  row.enabled = false;
  row.updatedAt = new Date().toISOString();
  await saveShares(file);
  return { ok: true, share: toPublic(row) };
}

export async function deleteMrtShare(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const file = await loadShares();
  const next = file.shares.filter((s) => s.id !== id);
  if (next.length === file.shares.length) {
    return { ok: false, error: "Audience not found" };
  }
  await saveShares({ shares: next });
  return { ok: true };
}

export async function revealMrtSharePassword(
  id: string,
): Promise<
  | { ok: true; password: string }
  | { ok: false; error: string }
> {
  const row = await getMrtShareById(id);
  if (!row) return { ok: false, error: "Audience not found" };
  if (!row.passwordVault) {
    return {
      ok: false,
      error: "Not stored — replace password to enable view.",
    };
  }
  const password = openPassword(row.passwordVault);
  if (password == null) {
    return { ok: false, error: "Could not open vault" };
  }
  return { ok: true, password };
}

export async function authorizeMrtShare(credentials: {
  name?: string;
  password?: string;
  shareId?: string;
  ip?: string;
}): Promise<{
  id: string;
  name: string;
  email: string;
  role: string;
  shareId: string;
  shareExp: string;
  shareV: string;
} | null> {
  const name = credentials.name?.trim() ?? "";
  const password = credentials.password ?? "";
  const shareId = credentials.shareId?.trim() ?? "";
  const ip = credentials.ip?.trim() || "unknown";
  if (name.length < 3 || !shareId || !password) return null;

  const row = await getMrtShareById(shareId);
  if (!row || !shareIsLive(row)) return null;
  if (!(await passwordsMatch(password, row.passwordHash, row.salt))) return null;

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const ipKey = ip.replace(/[^a-zA-Z0-9.:-]/g, "").slice(0, 40) || "unknown";
  return {
    id: `mrt-guest-${slug || "guest"}-${ipKey}`,
    name,
    email: "mrt-guest@local",
    role: "mrt-guest",
    shareId: row.id,
    shareExp: row.expiresAt,
    shareV: shareVFromHash(row.passwordHash),
  };
}
