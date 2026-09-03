/** Scryfall normal face for a ManaBox / Playmantis Scryfall UUID. */
export function scryfallImageUrl(scryfallId: string): string {
  const id = scryfallId.trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/.test(id)) return "";
  return `https://cards.scryfall.io/normal/front/${id[0]}/${id[1]}/${id}.jpg`;
}

/** Mate /data `image` field is often extensionless CloudFront — append .jpg for img tags. */
export function mateImageUrl(raw: string): string {
  const url = (raw || "").trim();
  if (!url) return "";
  if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(url)) return url;
  return `${url}.jpg`;
}
