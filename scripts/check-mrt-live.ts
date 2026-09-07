/**
 * Local check for MRT relational Neon (live plan + share door).
 * Never prints DATABASE_URL or store contents. Run from repo root:
 *   npx --yes tsx scripts/check-mrt-live.ts
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { getSunwaterMrtStore } from "../src/core/store/json-store";
import { listMrtSharesPublic } from "../src/core/store/mrt-share";
import {
  pgCountMrtDams,
  pgGetMrtLive,
  postgresEnabled,
} from "../src/core/store/simple-pg";
import {
  diffPaths,
  rowsToStore,
  storeToRows,
} from "../src/core/store/mrt-relational";
import { scheduleStoreSchema } from "../src/modules/sunwater-mrt/schema";

function damCount(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const dams = (raw as { dams?: unknown }).dams;
  return Array.isArray(dams) ? dams.length : 0;
}

async function checkJsonFallback(): Promise<void> {
  delete process.env.DATABASE_URL;
  if (postgresEnabled()) {
    throw new Error("postgresEnabled() true after unsetting DATABASE_URL");
  }
  const store = await getSunwaterMrtStore();
  const shares = await listMrtSharesPublic();
  if (!Array.isArray(store.dams)) {
    throw new Error("JSON fallback: store.dams missing");
  }
  console.log(
    `json-fallback: getSunwaterMrtStore dams=${store.dams.length} shares=${shares.length} — ok`,
  );
}

function checkEncoderRoundtrip(): void {
  const file = path.join(process.cwd(), "data", "sunwater-mrt.json");
  if (!existsSync(file)) {
    console.log("encoder: laptop JSON missing — skip");
    return;
  }
  const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
  const parsed = scheduleStoreSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("encoder: laptop JSON failed schema");
  }
  const back = scheduleStoreSchema.parse(rowsToStore(storeToRows(parsed.data)));
  const paths = diffPaths(parsed.data, back);
  if (paths.length) {
    throw new Error(`encoder: DIFF ${paths.join(", ")}`);
  }
  console.log(
    `encoder: roundtrip dams=${parsed.data.dams.length} occ=${Object.keys(parsed.data.scheduledDetails).length} — ok`,
  );
}

async function checkPostgres(): Promise<void> {
  if (!postgresEnabled()) {
    console.log("postgres: URL not in this process — explode script loads Azure URL in-memory");
    return;
  }
  const raw = await pgGetMrtLive();
  if (raw == null) {
    console.log("postgres: mrt_plan empty — explode not applied");
    return;
  }
  const dams = damCount(raw);
  const tableDams = await pgCountMrtDams();
  console.log(`postgres: assemble-dams=${dams} table-dams=${tableDams} — ok`);
}

async function main() {
  checkEncoderRoundtrip();
  await checkJsonFallback();
  await checkPostgres();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
