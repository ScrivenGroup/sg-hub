/**
 * Pass-1 parking upsert (superseded 2026-09-05).
 * Live plan is now relational tables — use scripts/explode-mrt-relational.ts.
 * This file kept as history; do not run it to recreate mrt_live JSONB.
 */
import { spawnSync } from "child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import os from "os";
import path from "path";
import {
  pgEnd,
  pgGetMrtLive,
  pgGetMrtShares,
  pgReplaceMrtShares,
  pgUpsertMrtLive,
  postgresEnabled,
  type MrtShareRow,
} from "../src/core/store/simple-pg";
import { scheduleStoreSchema } from "../src/modules/sunwater-mrt/schema";

const APP = "app-scrivengroup";
const RG = "rg-scrivengroup";
const MIN_DAMS = 20;

function azBin(): string {
  if (process.platform !== "win32") return "az";
  const candidates = [
    path.join(
      process.env.ProgramFiles || "",
      "Microsoft SDKs",
      "Azure",
      "CLI2",
      "wbin",
      "az.cmd",
    ),
    path.join(
      process.env.LOCALAPPDATA || "",
      "Programs",
      "Azure",
      "CLI2",
      "wbin",
      "az.cmd",
    ),
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return "az.cmd";
}

function redact(text: string): string {
  return text
    .replace(/postgres(ql)?:\/\/[^\s]+/gi, "[redacted]")
    .replace(/DATABASE_URL[^\s]*/gi, "[redacted]");
}

function az(args: string[]): { ok: boolean; stdout: string; stderr: string; status: number | null; error?: string } {
  const bin = process.platform === "win32" ? "az" : azBin();
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
    shell: process.platform === "win32",
  });
  return {
    ok: result.status === 0 && !result.error,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status,
    error: result.error?.message,
  };
}

function damCount(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const dams = (raw as { dams?: unknown }).dams;
  return Array.isArray(dams) ? dams.length : 0;
}

function parseShares(raw: unknown): MrtShareRow[] {
  if (!raw || typeof raw !== "object") return [];
  const shares = (raw as { shares?: unknown }).shares;
  if (!Array.isArray(shares)) return [];
  const out: MrtShareRow[] = [];
  for (const row of shares) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || !r.id) continue;
    if (typeof r.audience !== "string") continue;
    if (typeof r.passwordHash !== "string" || typeof r.salt !== "string") continue;
    if (typeof r.expiresAt !== "string" || typeof r.updatedAt !== "string") continue;
    out.push({
      id: r.id,
      audience: r.audience,
      enabled: Boolean(r.enabled),
      passwordHash: r.passwordHash,
      salt: r.salt,
      ...(typeof r.passwordVault === "string" ? { passwordVault: r.passwordVault } : {}),
      expiresAt: r.expiresAt,
      updatedAt: r.updatedAt,
    });
  }
  return out;
}

function laptopDamCountOnly(): number | "missing" {
  const full = path.join(process.cwd(), "data", "sunwater-mrt.json");
  if (!existsSync(full)) return "missing";
  try {
    const raw = JSON.parse(readFileSync(full, "utf8")) as unknown;
    return damCount(raw);
  } catch {
    return "missing";
  }
}

function loadDatabaseUrlFromAzure(): boolean {
  const result = az([
    "webapp",
    "config",
    "appsettings",
    "list",
    "--name",
    APP,
    "--resource-group",
    RG,
    "-o",
    "json",
  ]);
  if (!result.ok) return false;
  try {
    const rows = JSON.parse(result.stdout) as Array<{ name?: string; value?: string }>;
    const row = rows.find((item) => item.name === "DATABASE_URL");
    const value = (row?.value ?? "").trim();
    if (!value) return false;
    process.env.DATABASE_URL = value;
    return true;
  } catch {
    return false;
  }
}

async function fetchKuduToFile(
  relPath: string,
  dest: string,
): Promise<{ ok: boolean; status: number; bytes: number; via: string }> {
  const ps1 = path.join(process.cwd(), "scripts", "fetch-kudu-file.ps1");
  const ps = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      ps1,
      "-RelPath",
      relPath,
      "-Dest",
      dest,
    ],
    { encoding: "utf8", timeout: 180_000, windowsHide: true },
  );
  const out = `${ps.stdout || ""}\n${ps.stderr || ""}`;
  for (const line of out.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) console.log(`kudu: ${redact(trimmed)}`);
  }
  if (ps.status === 0 && existsSync(dest)) {
    const bytes = readFileSync(dest).byteLength;
    return { ok: bytes > 0, status: 200, bytes, via: "pwsh-aad-vfs" };
  }

  const tokenResult = az([
    "account",
    "get-access-token",
    "--resource",
    "https://management.azure.com/",
    "--query",
    "accessToken",
    "-o",
    "tsv",
  ]);
  const token = tokenResult.stdout.trim();
  const hosts = [
    "app-scrivengroup-ebcdarc2cwbtcjaa.scm.australiaeast-01.azurewebsites.net",
  ];
  if (token) {
    for (const host of hosts) {
      const url = `https://${host}/api/vfs/site/wwwroot/${relPath}`;
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(30_000),
        });
        console.log(`kudu: fetch ${host} status=${res.status}`);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          writeFileSync(dest, buf);
          return { ok: true, status: res.status, bytes: buf.length, via: "aad-vfs" };
        }
        if (res.status !== 401 && res.status !== 403) {
          return { ok: false, status: res.status, bytes: 0, via: "aad-vfs" };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "fetch-error";
        console.log(`kudu: fetch ${host} err=${redact(message).slice(0, 80)}`);
      }
    }
  } else {
    console.log("kudu: no ARM token for node fetch fallback");
  }

  for (const host of hosts) {
    const rest = az([
      "rest",
      "--method",
      "GET",
      "--url",
      `https://${host}/api/vfs/site/wwwroot/${relPath}`,
      "--resource",
      "https://management.azure.com/",
    ]);
    console.log(
      `kudu: az-rest ${host} ok=${rest.ok} exit=${rest.status} bytes=${Buffer.byteLength(rest.stdout || "")}`,
    );
    if (rest.ok && rest.stdout.trim()) {
      writeFileSync(dest, rest.stdout, "utf8");
      return {
        ok: true,
        status: 200,
        bytes: Buffer.byteLength(rest.stdout),
        via: "az-rest",
      };
    }
  }

  return { ok: false, status: 0, bytes: 0, via: "none" };
}

async function main() {
  console.log(`laptop-dams: ${laptopDamCountOnly()} (not used as source)`);

  const account = az(["account", "show", "-o", "json"]);
  if (!account.ok) {
    const errBit = redact((account.error || account.stderr || "").replace(/\s+/g, " ")).slice(0, 180);
    console.log(
      `azure: not logged in — JOB BLOCKED on migrate (az-exit=${account.status} ${errBit})`,
    );
    process.exit(2);
  }

  if (!loadDatabaseUrlFromAzure()) {
    console.log("neon: DATABASE_URL name/value missing on Azure — JOB BLOCKED on migrate");
    process.exit(2);
  }
  if (!postgresEnabled()) {
    console.log("neon: URL loaded but postgresEnabled() is false — JOB BLOCKED on migrate");
    process.exit(2);
  }
  console.log("neon: Azure DATABASE_URL loaded (not printed)");

  const tmp = mkdtempSync(path.join(os.tmpdir(), "sg-mrt-mig-"));
  const planFile = path.join(tmp, "sunwater-mrt.json");
  const shareFile = path.join(tmp, "mrt-share.json");

  try {
    const plan = await fetchKuduToFile("data/sunwater-mrt.json", planFile);
    console.log(
      `azure-plan: ${plan.ok ? "ok" : "fail"} status=${plan.status} bytes=${plan.bytes} via=${plan.via}`,
    );
    if (!plan.ok) {
      console.log("azure-fetch: failed — JOB BLOCKED on migrate (laptop JSON not copied)");
      process.exit(2);
    }

    let planRaw: unknown;
    try {
      planRaw = JSON.parse(readFileSync(planFile, "utf8")) as unknown;
    } catch {
      console.log("azure-plan: parse fail — JOB BLOCKED on migrate");
      process.exit(2);
    }
    const dams = damCount(planRaw);
    console.log(`azure-plan-dams: ${dams}`);
    if (dams < MIN_DAMS) {
      console.log(
        `azure-plan: dams < ${MIN_DAMS} — refuse upsert — JOB BLOCKED on migrate`,
      );
      process.exit(2);
    }
    const parsed = scheduleStoreSchema.safeParse(planRaw);
    if (!parsed.success) {
      console.log("azure-plan: schema fail — JOB BLOCKED on migrate");
      process.exit(2);
    }
    await pgUpsertMrtLive(parsed.data);
    const verify = await pgGetMrtLive();
    const verifyDams = damCount(verify);
    console.log(`neon-live-upsert: ok verify-dams=${verifyDams}`);
    if (verifyDams !== dams) {
      console.log("neon-live-upsert: dam count mismatch — JOB BLOCKED on migrate");
      process.exit(2);
    }

    const share = await fetchKuduToFile("data/mrt-share.json", shareFile);
    if (!share.ok) {
      console.log(
        `azure-share: skip status=${share.status} via=${share.via} (no live share file)`,
      );
    } else {
      let shareRaw: unknown;
      try {
        shareRaw = JSON.parse(readFileSync(shareFile, "utf8")) as unknown;
      } catch {
        console.log("azure-share: parse fail — skipped");
        shareRaw = null;
      }
      if (shareRaw) {
        const rows = parseShares(shareRaw);
        await pgReplaceMrtShares(rows);
        const check = await pgGetMrtShares();
        console.log(`neon-share-upsert: ok rows=${check.length}`);
      }
    }

    console.log("migrate: done");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    await pgEnd();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(redact(message));
  process.exit(1);
});
