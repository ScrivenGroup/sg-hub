/** Localhost WIP desk label. Station and Azure omit `WIP_DESK`. */
export function wipDeskLabel(): string | null {
  const raw = (process.env.WIP_DESK || "").trim();
  return raw || null;
}
