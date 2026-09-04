/**
 * Leaf version shown in MTG Buylist chrome.
 *
 * Numbering:
 * - Live update: bump 1.x → 1.(x+1) here and add a changelog **release**. This ship is 1.2.
 * - While developing toward the next live: 1.x.y (1.2.1, 1.2.2, …). Not used until that process starts.
 * - 2.0 / 3.0 only when the user explicitly says so.
 */
export const MTG_BUYLIST_VERSION = "1.2";
/** Instant this version shipped (ISO UTC). */
export const MTG_BUYLIST_VERSION_AT = "2026-09-04T09:10:00.000Z";
/** Fixed Australia/Brisbane display — avoids locale hydration mismatch. */
export const MTG_BUYLIST_VERSION_WHEN = "4 Sep 2026, 7:10 pm";
