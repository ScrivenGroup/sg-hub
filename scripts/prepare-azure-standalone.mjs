import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { execSync } from "child_process";

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

console.log("Prepared", out);
console.log("Next: npm run deploy:zip");
