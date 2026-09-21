/**
 * Leaf version shown in MTG Buylist chrome.
 *
 * Numbering:
 * - Live update: bump 1.x → 1.(x+1) here and add a changelog **release**. Last live is 1.6.
 * - Publish to localhost (dev): 1.x.y — each slice gets its own changelog row. Current desk 1.6.1.
 * - 2.0 / 3.0 only when the user explicitly says so.
 */
export const MTG_BUYLIST_VERSION = "1.6.1";
/** Instant this version shipped (ISO UTC). */
export const MTG_BUYLIST_VERSION_AT = "2026-09-21T01:15:00.000Z";
/** Fixed Australia/Brisbane display — avoids locale hydration mismatch. */
export const MTG_BUYLIST_VERSION_WHEN = "21 Sep 2026, 11:15 am";
