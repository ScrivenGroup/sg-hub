import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ps1 = path.join(root, "scripts", "make-linux-zip.ps1");
const shells = process.platform === "win32" ? ["powershell", "pwsh"] : ["pwsh", "powershell"];

for (const exe of shells) {
  const result = spawnSync(
    exe,
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1],
    { cwd: root, stdio: "inherit" },
  );
  if (result.error?.code === "ENOENT") continue;
  process.exit(result.status ?? 1);
}

console.error("Need PowerShell (Windows) or pwsh (Linux CI) to run scripts/make-linux-zip.ps1");
process.exit(1);
