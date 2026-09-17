import {
  DEFAULT_BUYLIST_RUN_ID,
  MAX_LIVE_BUYLIST_RUNS,
  emptyMtgBuylistStore,
  type BuylistArchive,
  type BuylistHarvest,
  type BuylistOwnerIndex,
  type BuylistRunFile,
  type BuylistRunMeta,
  type MtgBuylistStore,
} from "../schema";

export { DEFAULT_BUYLIST_RUN_ID, MAX_LIVE_BUYLIST_RUNS };

export function emptyBuylistHarvest(): BuylistHarvest {
  return { mate: null, playmantis: null, mateImageLinks: {} };
}

export function harvestHasStoredData(harvest: BuylistHarvest): boolean {
  return Boolean(
    harvest.mate || harvest.playmantis || Object.keys(harvest.mateImageLinks || {}).length,
  );
}

export function runNeedsAllocate(
  store: Pick<
    MtgBuylistStore,
    "csv" | "mate" | "playmantis" | "resultPm" | "resultMate" | "resultCompare"
  >,
): boolean {
  if (!store.csv) return false;
  if (store.mate && !store.resultMate) return true;
  if (store.playmantis && !store.resultPm) return true;
  if ((store.mate || store.playmantis) && !store.resultCompare) return true;
  return false;
}

export function emptyBuylistRunFile(id = DEFAULT_BUYLIST_RUN_ID): BuylistRunFile {
  return {
    id,
    updatedAt: new Date().toISOString(),
    csv: null,
    mate: null,
    playmantis: null,
    resultPm: null,
    resultMate: null,
    resultCompare: null,
    mateConfirmations: {},
    mateReconfirm: {},
    mateImageLinks: {},
  };
}

export function emptyBuylistOwnerIndex(): BuylistOwnerIndex {
  return {
    notes: "",
    activeRunId: "",
    runs: [],
    archives: [],
    harvestFolded: true,
  };
}

export function runHasStoredData(
  run: Pick<
    BuylistRunFile,
    "csv" | "mate" | "playmantis" | "resultPm" | "resultMate" | "resultCompare"
  >,
): boolean {
  return Boolean(
    run.csv ||
      run.mate ||
      run.playmantis ||
      run.resultPm ||
      run.resultMate ||
      run.resultCompare,
  );
}

export function runDisplayName(run: Pick<BuylistRunFile, "csv">, fallback: string): string {
  const filename = run.csv?.filename?.trim() || "";
  if (!filename) return fallback;
  return filename.replace(/\.csv$/i, "") || fallback;
}

export function metaFromRun(run: BuylistRunFile, fallbackName = "This run"): BuylistRunMeta {
  return {
    id: run.id,
    name: runDisplayName(run, fallbackName),
    csvFilename: run.csv?.filename || "",
    updatedAt: run.updatedAt,
    hasData: runHasStoredData(run),
  };
}

export function assembleBuylistStore(
  index: BuylistOwnerIndex,
  run: BuylistRunFile,
): MtgBuylistStore {
  return {
    updatedAt: run.updatedAt || new Date().toISOString(),
    notes: index.notes || "",
    csv: run.csv,
    mate: run.mate ?? null,
    playmantis: run.playmantis ?? null,
    resultPm: run.resultPm,
    resultMate: run.resultMate,
    resultCompare: run.resultCompare,
    mateConfirmations: run.mateConfirmations || {},
    mateReconfirm: run.mateReconfirm || {},
    mateImageLinks: run.mateImageLinks || {},
  };
}

export function splitBuylistStore(store: MtgBuylistStore, runId: string): {
  harvest: BuylistHarvest;
  run: BuylistRunFile;
} {
  return {
    harvest: emptyBuylistHarvest(),
    run: {
      id: runId,
      updatedAt: store.updatedAt || new Date().toISOString(),
      csv: store.csv,
      mate: store.mate ?? null,
      playmantis: store.playmantis ?? null,
      resultPm: store.resultPm,
      resultMate: store.resultMate,
      resultCompare: store.resultCompare,
      mateConfirmations: store.mateConfirmations || {},
      mateReconfirm: store.mateReconfirm || {},
      mateImageLinks: store.mateImageLinks || {},
    },
  };
}

export function splitLegacyStore(store: MtgBuylistStore): {
  index: BuylistOwnerIndex;
  harvest: BuylistHarvest;
  run: BuylistRunFile;
} {
  const { harvest, run } = splitBuylistStore(store, DEFAULT_BUYLIST_RUN_ID);
  if (!runHasStoredData(run)) {
    return {
      index: {
        notes: store.notes || "",
        activeRunId: "",
        runs: [],
        archives: [],
        harvestFolded: true,
      },
      harvest,
      run,
    };
  }
  return {
    index: {
      notes: store.notes || "",
      activeRunId: run.id,
      runs: [metaFromRun(run)],
      archives: [],
      harvestFolded: true,
    },
    harvest,
    run,
  };
}

export function newBuylistRunId(): string {
  return `run-${Date.now().toString(36)}`;
}

export function pickArchiveVictim(
  runs: BuylistRunMeta[],
  keepId?: string,
): BuylistRunMeta | null {
  const candidates = runs.filter((run) => run.id !== keepId);
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
}

export function shouldArchiveForNewRun(liveCount: number): boolean {
  return liveCount >= MAX_LIVE_BUYLIST_RUNS;
}

export function archiveFromMeta(meta: BuylistRunMeta, archivedAt = new Date().toISOString()): BuylistArchive {
  return {
    id: meta.id,
    name: meta.name,
    csvFilename: meta.csvFilename || "",
    archivedAt,
  };
}

export function emptyAssembledStore(notes = ""): MtgBuylistStore {
  return { ...emptyMtgBuylistStore(), notes };
}
