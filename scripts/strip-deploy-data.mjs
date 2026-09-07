import { existsSync, rmSync } from "fs";
import path from "path";

/** Remove app-root `data/` so zip/standalone never ships laptop JSON. */
export function stripDeployDataDir(root) {
  const dataDir = path.join(root, "data");
  if (!existsSync(dataDir)) return false;
  rmSync(dataDir, { recursive: true, force: true });
  return true;
}
