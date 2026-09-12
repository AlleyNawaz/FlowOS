import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const tauriConfig = readJson("src-tauri/tauri.conf.json");
const cargoToml = readFileSync(resolve(root, "src-tauri/Cargo.toml"), "utf8");
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

const versions = {
  "package.json": packageJson.version,
  "package-lock.json": packageLock.version,
  "package-lock root package": packageLock.packages?.[""]?.version,
  "src-tauri/Cargo.toml": cargoVersion,
  "src-tauri/tauri.conf.json": tauriConfig.version,
};

const expected = packageJson.version;
const mismatches = Object.entries(versions).filter(([, version]) => version !== expected);
if (mismatches.length) {
  console.error(`FlowOS version mismatch. Expected ${expected}:`);
  for (const [file, version] of mismatches) console.error(`- ${file}: ${version ?? "missing"}`);
  process.exit(1);
}

const releaseTag = process.env.RELEASE_TAG?.replace(/^v/, "");
if (releaseTag && releaseTag !== expected) {
  console.error(`Release tag ${releaseTag} does not match application version ${expected}.`);
  process.exit(1);
}

console.log(`FlowOS version ${expected} is synchronized across all manifests.`);

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}
