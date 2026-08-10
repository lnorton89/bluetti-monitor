import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  API_URL,
  BROKER_URL,
  DASHBOARD_URL,
  ensureDockerStack,
  getBinPath,
  installSignalHandlers,
  printDashboardUrls,
  resolveDeviceAddress,
  sleep,
  spawnCommand,
  waitForUrl,
} from "../monitor/shared.mjs";
import { acquireMonitorLock, releaseMonitorLock } from "../lock.mjs";

const DASHBOARD_READY_MARKER = "<!doctype html>";
const BRIDGE_RESTART_DELAY_MS = 5_000;
const DOCKER_READY_RETRIES = 10;
const DOCKER_READY_RETRY_DELAY_MS = 15_000;

const APP_IDENTIFIER = "dev.lawrence.bluetti-monitor";
const APP_CHANNEL = "stable";
const LAUNCHER_NAME = "launcher.exe";
const LAUNCHER_SEARCH_DEPTH = 6;

let bridgeProcess = null;
let stopping = false;

async function main() {
  const lock = acquireMonitorLock("boot:start-on-boot");
  if (lock.acquired) {
    console.log("[boot] Starting Docker-backed services...");
    await ensureDockerStackWithRetry();

    await waitForUrl(`${API_URL}/devices`, "api");
    await waitForUrl(DASHBOARD_URL, "dashboard", DASHBOARD_READY_MARKER);

    const device = await resolveDeviceAddress();
    const bridgeBin = getBinPath("bluetti-mqtt-node");
    console.log(`[boot] Starting bluetti-mqtt-node via package CLI for ${device.mac}...`);

    startBridge(bridgeBin, device.mac);

    printDashboardUrls();
    console.log(`[boot] API: ${API_URL}`);
    console.log(`[boot] Device source: ${device.source}`);
  } else {
    console.log(
      `[boot] Stack already managed by pid ${lock.existing.pid} (${lock.existing.label}); waiting for it to come up.`,
    );
    await waitForUrl(DASHBOARD_URL, "dashboard", DASHBOARD_READY_MARKER);
  }

  launchDesktopApp();
}

installSignalHandlers(async () => {
  stopping = true;
  if (bridgeProcess && !bridgeProcess.killed) {
    bridgeProcess.kill();
  }
  releaseMonitorLock();
});

main().catch((error) => {
  console.error("[boot] Failed to start monitor stack:", error);
  releaseMonitorLock();
  process.exit(1);
});

async function ensureDockerStackWithRetry() {
  for (let attempt = 1; attempt <= DOCKER_READY_RETRIES; attempt += 1) {
    try {
      await ensureDockerStack();
      return;
    } catch (error) {
      if (attempt === DOCKER_READY_RETRIES) {
        throw error;
      }

      console.warn(
        `[boot] Docker not ready yet (attempt ${attempt}/${DOCKER_READY_RETRIES}); retrying in ${DOCKER_READY_RETRY_DELAY_MS}ms.`,
      );
      console.warn(
        "[boot] If this keeps failing, enable \"Start Docker Desktop when you sign in\" in Docker Desktop settings.",
      );
      await sleep(DOCKER_READY_RETRY_DELAY_MS);
    }
  }
}

function startBridge(bridgeBin, deviceAddress) {
  if (stopping) return;

  bridgeProcess = spawnCommand(bridgeBin, ["--broker", BROKER_URL, deviceAddress], {
    env: { ...process.env },
  });

  bridgeProcess.once("close", (exitCode) => {
    if (stopping) return;

    console.error(
      `[boot] bluetti-mqtt-node exited with code ${exitCode}; restarting in ${BRIDGE_RESTART_DELAY_MS}ms.`,
    );
    setTimeout(() => startBridge(bridgeBin, deviceAddress), BRIDGE_RESTART_DELAY_MS);
  });
}

function launchDesktopApp() {
  const launcherPath = findInstalledLauncher();

  if (!launcherPath) {
    console.warn(
      "[boot] Bluetti Monitor desktop app is not installed; opening the dashboard in the default browser instead.",
    );
    console.warn('[boot] Run "Bluetti Monitor-Setup.exe" once to install the desktop app for future boots.');
    spawn("cmd.exe", ["/c", "start", "", DASHBOARD_URL], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return;
  }

  console.log(`[boot] Launching installed desktop app: ${launcherPath}`);
  spawn(launcherPath, [], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

function findInstalledLauncher() {
  if (process.platform !== "win32" || !process.env.LOCALAPPDATA) {
    return null;
  }

  const root = join(process.env.LOCALAPPDATA, APP_IDENTIFIER, APP_CHANNEL);
  if (!existsSync(root)) {
    return null;
  }

  return findFile(root, LAUNCHER_NAME, LAUNCHER_SEARCH_DEPTH);
}

function findFile(dir, name, depth) {
  if (depth < 0) return null;

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase() === name.toLowerCase()) {
      return join(dir, entry.name);
    }
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const found = findFile(join(dir, entry.name), name, depth - 1);
      if (found) return found;
    }
  }

  return null;
}
