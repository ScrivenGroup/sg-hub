import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { execSync } from "child_process";
import { stripDeployDataDir } from "./strip-deploy-data.mjs";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const out = path.join(root, ".azure-deploy");

if (!existsSync(standalone)) {
  console.error("Missing .next/standalone — run npm run build first");
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
if (stripDeployDataDir(standalone)) {
  console.log("Removed data/ from .next/standalone (do not ship laptop JSON)");
}
cpSync(standalone, out, { recursive: true });
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(out, ".next", "static");
cpSync(staticSrc, staticDest, {
  recursive: true,
  filter: (file) => {
    const rel = path.relative(staticSrc, file);
    if (!rel || rel === ".") return true;
    const parts = rel.split(path.sep);
    if (parts[0] === "development") return false;
    if (parts.some((p) => p.includes("hmr-client") || p.includes("_browser_dev_"))) return false;
    return true;
  },
});
cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });

function ensureRoutesManifest(dir) {
  const manifestPath = path.join(dir, ".next", "routes-manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("Missing .next/routes-manifest.json in deploy folder");
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  let changed = false;
  for (const key of ["dataRoutes", "dynamicRoutes", "staticRoutes"]) {
    if (!Array.isArray(manifest[key])) {
      manifest[key] = [];
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(manifestPath, JSON.stringify(manifest));
    console.log("Patched routes-manifest.json (missing route arrays would crash node server.js)");
  }
}
ensureRoutesManifest(out);

const ffRef = path.join(root, "src/modules/funds-forecaster/reference/index.html");
if (existsSync(ffRef)) {
  const destDir = path.join(out, "src/modules/funds-forecaster/reference");
  mkdirSync(destDir, { recursive: true });
  cpSync(ffRef, path.join(destDir, "index.html"));
}

const pkgPath = path.join(out, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.scripts = {
  build: "node -e \"console.log('prebuilt standalone - skip build')\"",
  start: "node server.js",
};
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

// Azure is Linux — Windows builds pull win32 sharp; install linux-x64 sharp for runtime.
try {
  console.log("Installing linux sharp into deploy folder...");
  execSync("npm install --omit=dev --no-save sharp --os=linux --cpu=x64", {
    cwd: out,
    stdio: "inherit",
    env: {
      ...process.env,
      npm_config_platform: "linux",
      npm_config_arch: "x64",
    },
  });
} catch (e) {
  console.warn("linux sharp install failed (continuing):", e.message);
}

if (stripDeployDataDir(out)) {
  console.log("Removed data/ from deploy folder (do not ship laptop JSON)");
} else {
  console.log("No data/ in deploy folder (ok)");
}

console.log("Prepared", out);
console.log("Next: npm run deploy:zip");
