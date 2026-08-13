import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import path from "path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const out = path.join(root, ".azure-deploy");

if (!existsSync(standalone)) {
  console.error("Missing .next/standalone — run npm run build first");
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(standalone, out, { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(out, ".next", "static"), {
  recursive: true,
});
cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });

console.log("Prepared", out);
console.log("Deploy with: az webapp deploy -g rg-scrivengroup -n app-scrivengroup --src-path .azure-deploy --type zip");
