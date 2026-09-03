/** Mate UUID is not Scryfall. Join on set + normalised name + finish. */

const TREATMENT_SUFFIXES = [
  "surge foil",
  "galaxy foil",
  "etched foil",
  "extended art",
  "borderless",
  "showcase",
  "extended",
  "etched",
  "galaxy",
  "promo",
  "surge",
  "foil",
];

export type NormalisedName = {
  name: string;
  collectorNumber: string;
};

export function csvFinishToMate(foil: string): string {
  const key = normalizeFinish(foil);
  if (key === "foil") return "Foil";
  if (key === "etched") return "Etched";
  return "Nonfoil";
}

export function normalizeFinish(raw: string): string {
  const s = (raw || "").trim().toLowerCase();
  if (!s || s === "normal" || s === "nonfoil" || s === "regular" || s === "false") {
    return "nonfoil";
  }
  if (s === "true" || s === "foil") return "foil";
  if (s.includes("etched")) return "etched";
  if (s.includes("foil") || s.includes("surge")) return "foil";
  return s;
}

export function normalizeSetCode(raw: string): string {
  return (raw || "").trim().toLowerCase();
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Collector from Mate product titles like "Bard's Company (Borderless 210)"
 * or trailing "(46)". Empty when absent.
 */
export function mateCollectorFromName(raw: string): string {
  const name = decodeHtmlEntities(raw || "").trim();
  const labeled = name.match(
    /\((?:borderless|showcase|extended\s*art|poster|surge\s*foil)[^)]*?(\d+)\)\s*$/i,
  );
  if (labeled) return labeled[1];
  const plain = name.match(/\((\d+)\)\s*$/);
  return plain ? plain[1] : "";
}

/** Mate treatment suffix on the product name, e.g. "(Extended Art)". */
export function mateTreatmentKey(raw: string): string {
  const lower = decodeHtmlEntities(raw || "").trim().toLowerCase();
  if (/\(.*extended\s*art.*\)/.test(lower) || lower.endsWith(" extended art")) {
    return "extendedart";
  }
  if (/\(.*borderless.*\)/.test(lower) || lower.endsWith(" borderless")) {
    return "borderless";
  }
  if (/\(.*showcase.*\)/.test(lower) || lower.endsWith(" showcase")) {
    return "showcase";
  }
  return "";
}

/** CSV / Scryfall frame_effects → same keys as mateTreatmentKey. */
export function csvTreatmentKey(frameEffects: string[] | undefined): string {
  const effects = (frameEffects || []).map((f) => f.toLowerCase());
  if (effects.includes("extendedart")) return "extendedart";
  if (effects.includes("borderless")) return "borderless";
  if (effects.includes("showcase")) return "showcase";
  return "";
}

export function normalizeCardName(raw: string): NormalisedName {
  let name = decodeHtmlEntities(raw || "").trim();
  let collectorNumber = "";

  const collector = name.match(/^(.*)\s*\((\d+)\)\s*$/);
  if (collector) {
    name = collector[1].trim();
    collectorNumber = collector[2];
  }

  if (name.includes("//")) {
    name = name.split("//")[0].trim();
  }

  // Playmantis titles like "Armor Wars (Showcase - Panel)"
  name = name.replace(/\s*\([^)]*showcase[^)]*\)\s*$/i, "").trim();

  let changed = true;
  while (changed) {
    changed = false;
    const lower = name.toLowerCase();
    for (const suffix of TREATMENT_SUFFIXES) {
      if (lower.endsWith(` ${suffix}`)) {
        name = name.slice(0, name.length - suffix.length).trim();
        changed = true;
        break;
      }
      if (lower.endsWith(`(${suffix})`)) {
        name = name.slice(0, name.length - suffix.length - 2).trim();
        changed = true;
        break;
      }
    }
    name = name.replace(/[-–—,]+$/g, "").trim();
  }

  return {
    name: collapseSpaces(name).toLowerCase(),
    collectorNumber,
  };
}

export function mateJoinKey(
  setCode: string,
  name: string,
  finish: string,
  collectorNumber?: string,
): string {
  const norm = normalizeCardName(name);
  const collector = (collectorNumber || norm.collectorNumber || "").trim();
  const base = `${normalizeSetCode(setCode)}|${norm.name}|${normalizeFinish(finish)}`;
  return collector ? `${base}|${collector}` : base;
}

export function csvJoinKeys(row: {
  name: string;
  setCode: string;
  foil: string;
  collectorNumber?: string;
}): string[] {
  const finish = csvFinishToMate(row.foil);
  const collector = (row.collectorNumber || "").trim();
  const withCollector = mateJoinKey(row.setCode, row.name, finish, collector);
  const withoutCollector = mateJoinKey(row.setCode, row.name, finish, "");
  if (collector && withCollector !== withoutCollector) {
    return [withCollector, withoutCollector];
  }
  return [withoutCollector];
}

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
