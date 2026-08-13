import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
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

// Azure Deployments Preview runs `npm run build` — standalone has no src/app.
// Make build a no-op and start the standalone server.
const pkgPath = path.join(out, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.scripts = {
  build: "node -e \"console.log('prebuilt standalone — skip build')\"",
  start: "node server.js",
};
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

console.log("Prepared", out);
console.log("Also set App Setting SCM_DO_BUILD_DURING_DEPLOYMENT=false if Azure still rebuilds.");
