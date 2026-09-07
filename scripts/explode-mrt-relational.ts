/**
 * Copy Neon mrt_live JSONB (or Azure wwwroot if that parking table is thin)
 * into relational MRT tables on the same Neon. Drop mrt_live only after
 * dam-count + roundtrip verify. Never prints DATABASE_URL, hashes, or the plan.
 *
 * Run from repo root: npx --yes tsx scripts/explode-mrt-relational.ts
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
import postgres from "postgres";
import {
  pgCountMrtDams,
  pgEnd,
  pgGetMrtLive,
  pgUpsertMrtLive,
  postgresEnabled,
} from "../src/core/store/simple-pg";
import { diffPaths } from "../src/core/store/mrt-relational";
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

function az(args: string[]): {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
  error?: string;
} {
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

function azureDatabaseUrlNamePresent(): boolean {
  const result = az([
    "webapp",
    "config",
    "appsettings",
    "list",
    "--name",
    APP,
    "--resource-group",
    RG,
    "--query",
    "[].name",
    "-o",
    "json",
  ]);
  if (!result.ok) return false;
  try {
    const names = JSON.parse(result.stdout) as unknown;
    return Array.isArray(names) && names.includes("DATABASE_URL");
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

async function peekParkingBlob(
  sql: ReturnType<typeof postgres>,
): Promise<{ present: boolean; dams: number; raw: unknown }> {
  const tables = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'mrt_live'
  `;
  if (!tables[0]?.n) return { present: false, dams: 0, raw: null };
  const rows = await sql<{ body: unknown }[]>`
    SELECT body FROM mrt_live WHERE id = 'sunwater-mrt' LIMIT 1
  `;
  const raw = rows[0]?.body ?? null;
  return { present: true, dams: damCount(raw), raw };
}

async function main() {
  console.log(`laptop-dams: ${laptopDamCountOnly()} (not used as source)`);

  const account = az(["account", "show", "-o", "json"]);
  if (!account.ok) {
    const errBit = redact((account.error || account.stderr || "").replace(/\s+/g, " ")).slice(
      0,
      180,
    );
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
  console.log("lives: azure-website=leave-up neon=keep parking-table=mrt_live");

  const url = (process.env.DATABASE_URL ?? "").trim();
  const peekSql = postgres(url, { max: 1, prepare: false });
  const tmp = mkdtempSync(path.join(os.tmpdir(), "sg-mrt-rel-"));
  let dropped = false;

  try {
    const peek = await peekParkingBlob(peekSql);
    console.log(`parking: present=${peek.present} dams=${peek.dams}`);

    let sourceRaw: unknown = null;
    let sourceVia = "none";

    if (peek.dams >= MIN_DAMS) {
      sourceRaw = peek.raw;
      sourceVia = "neon-mrt_live";
    } else {
      const planFile = path.join(tmp, "sunwater-mrt.json");
      const plan = await fetchKuduToFile("data/sunwater-mrt.json", planFile);
      console.log(
        `azure-plan: ${plan.ok ? "ok" : "fail"} status=${plan.status} bytes=${plan.bytes} via=${plan.via}`,
      );
      if (!plan.ok) {
        console.log("azure-fetch: failed — JOB BLOCKED (parking table left in place)");
        process.exit(2);
      }
      try {
        sourceRaw = JSON.parse(readFileSync(planFile, "utf8")) as unknown;
      } catch {
        console.log("azure-plan: parse fail — JOB BLOCKED (parking table left in place)");
        process.exit(2);
      }
      sourceVia = "azure-wwwroot";
    }

    const sourceDams = damCount(sourceRaw);
    console.log(`source: via=${sourceVia} dams=${sourceDams}`);
    if (sourceDams < MIN_DAMS) {
      console.log(
        `source: dams < ${MIN_DAMS} — refuse explode — JOB BLOCKED (parking table left in place)`,
      );
      process.exit(2);
    }

    const parsed = scheduleStoreSchema.safeParse(sourceRaw);
    if (!parsed.success) {
      console.log("source: schema fail — JOB BLOCKED (parking table left in place)");
      process.exit(2);
    }

    await pgUpsertMrtLive(parsed.data);
    const verifyDams = await pgCountMrtDams();
    console.log(`relational-copy: ok verify-dams=${verifyDams}`);
    if (verifyDams !== sourceDams) {
      console.log(
        "relational-copy: dam count mismatch — JOB BLOCKED (parking table left in place)",
      );
      process.exit(2);
    }

    const assembled = await pgGetMrtLive();
    const back = scheduleStoreSchema.safeParse(assembled);
    if (!back.success) {
      console.log("assemble: schema fail — JOB BLOCKED (parking table left in place)");
      process.exit(2);
    }
    const paths = diffPaths(parsed.data, back.data);
    if (paths.length) {
      console.log(`roundtrip: DIFF paths=${paths.join(", ")}`);
      console.log("roundtrip: fail — JOB BLOCKED (parking table left in place)");
      process.exit(2);
    }
    console.log("roundtrip: ok (plan not printed)");

    await peekSql.unsafe("DROP TABLE IF EXISTS mrt_live");
    dropped = true;
    const gone = await peekSql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'mrt_live'
    `;
    console.log(`drop-parking: mrt_live gone=${gone[0]?.n === 0}`);
    if (gone[0]?.n !== 0) {
      console.log("drop-parking: table still present — JOB BLOCKED");
      process.exit(2);
    }

    const jsonbLeft = await peekSql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name LIKE 'mrt_%'
        AND data_type IN ('json', 'jsonb')
    `;
    console.log(`mrt-json-columns: ${jsonbLeft[0]?.n ?? -1}`);
    if ((jsonbLeft[0]?.n ?? 1) !== 0) {
      console.log("mrt-json-columns: leftover JSON — JOB BLOCKED");
      process.exit(2);
    }

    const shareStill = await peekSql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'mrt_share'
    `;
    console.log(`mrt_share: still=${shareStill[0]?.n === 1}`);

    const urlName = azureDatabaseUrlNamePresent();
    console.log(`azure-appsetting-DATABASE_URL-name: ${urlName ? "present" : "MISSING"}`);
    if (!urlName) {
      console.log("azure: DATABASE_URL name missing after work — unexpected");
      process.exit(2);
    }

    console.log("explode: done (no zip-deploy)");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    await peekSql.end({ timeout: 5 });
    await pgEnd();
    if (!dropped) console.log("parking: mrt_live left in place");
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(redact(message));
  process.exit(1);
});
