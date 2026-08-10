import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const submoduleRoot = join(projectRoot, "lib", "bluetti-mqtt-node");

// Flat, shallow output directories - not nested npm-style trees. Electrobun's
// native self-extractor throws "TarUnsupportedFileType" once a bundle path
// gets ~8+ directory levels deep (both a nested artifacts/helper/win-x64
// path and an ordinary node_modules/@scope/pkg/lib tree hit this). Bundling
// the bridge CLI into single flat files with Bun, and keeping the helper
// .NET publish output as a shallow sibling folder, both avoid it.
const bridgeOutDir = join(projectRoot, ".vendor", "bridge-dist");
const helperOutDir = join(projectRoot, ".vendor", "bridge-helper");

const cliDist = join(submoduleRoot, "dist", "cli");
const bridgeEntry = join(cliDist, "bluetti-mqtt.js");
const discoveryEntry = join(cliDist, "bluetti-discovery.js");
const helperSourceDir = join(submoduleRoot, "artifacts", "helper", "win-x64-plain");
const helperSourceExe = join(helperSourceDir, "BluettiMqtt.BluetoothHelper.exe");

if (!existsSync(bridgeEntry) || !existsSync(discoveryEntry)) {
  throw new Error(
    `Missing ${bridgeEntry} - run "npm run build" in lib/bluetti-mqtt-node before packaging.`,
  );
}
if (!existsSync(helperSourceExe)) {
  throw new Error(
    `Missing ${helperSourceExe} - run the plain multi-file helper publish in lib/bluetti-mqtt-node before packaging:\n` +
      "  dotnet publish helper\\BluettiMqtt.BluetoothHelper\\BluettiMqtt.BluetoothHelper.csproj -c Release -r win-x64 --self-contained false /p:DebugType=None /p:DebugSymbols=false -o artifacts\\helper\\win-x64-plain",
  );
}

console.log("[desktop:vendor] Bundling the bridge CLI for the installed app...");

rmSync(bridgeOutDir, { recursive: true, force: true });
mkdirSync(bridgeOutDir, { recursive: true });
execFileSync(
  "bun",
  ["build", bridgeEntry, discoveryEntry, "--target=bun", "--outdir", bridgeOutDir],
  { cwd: submoduleRoot, stdio: "inherit", shell: process.platform === "win32" },
);

console.log("[desktop:vendor] Staging the bundled BLE helper for the installed app...");

rmSync(helperOutDir, { recursive: true, force: true });
mkdirSync(helperOutDir, { recursive: true });
cpSync(helperSourceDir, helperOutDir, { recursive: true });

console.log("[desktop:vendor] Bundled bridge staged at .vendor/bridge-dist and .vendor/bridge-helper");
