import {
  API_URL,
  BROKER_URL,
  DASHBOARD_URL,
  ensureDockerStack,
  getBinPath,
  installSignalHandlers,
  printDashboardUrls,
  resolveDeviceAddress,
  spawnCommand,
  waitForUrl,
} from "./shared.mjs";
import { acquireMonitorLock, releaseMonitorLock } from "../lock.mjs";

const DASHBOARD_READY_MARKER = "<!doctype html>";
const BRIDGE_RESTART_DELAY_MS = 5_000;

let bridgeProcess = null;
let stopping = false;

async function main() {
  const lock = acquireMonitorLock("monitor:start");
  if (!lock.acquired) {
    console.log(
      `[monitor] Stack already managed by pid ${lock.existing.pid} (${lock.existing.label}); not starting a second bridge.`,
    );
    return;
  }

  console.log("[monitor] Starting Docker-backed services...");
  await ensureDockerStack();

  await waitForUrl(`${API_URL}/devices`, "api");
  await waitForUrl(DASHBOARD_URL, "dashboard", DASHBOARD_READY_MARKER);

  const device = await resolveDeviceAddress();
  const bridgeBin = getBinPath("bluetti-mqtt-node");
  console.log(`[monitor] Starting bluetti-mqtt-node via package CLI for ${device.mac}...`);

  startBridge(bridgeBin, device.mac);

  printDashboardUrls();
  console.log(`[monitor] API: ${API_URL}`);
  console.log(`[monitor] Device source: ${device.source}`);
  console.log("[monitor] Press Ctrl+C to stop the host bridge. Docker services stay up.");
}

installSignalHandlers(async () => {
  stopping = true;
  if (bridgeProcess && !bridgeProcess.killed) {
    bridgeProcess.kill();
  }
  releaseMonitorLock();
});

main().catch((error) => {
  console.error("[monitor] Failed to start monitor:", error);
  releaseMonitorLock();
  process.exit(1);
});

function startBridge(bridgeBin, deviceAddress) {
  if (stopping) return;

  bridgeProcess = spawnCommand(bridgeBin, ["--broker", BROKER_URL, deviceAddress], {
    env: { ...process.env },
  });

  bridgeProcess.once("close", (exitCode) => {
    if (stopping) return;

    console.error(
      `[monitor] bluetti-mqtt-node exited with code ${exitCode}; restarting in ${BRIDGE_RESTART_DELAY_MS}ms.`,
    );
    setTimeout(() => startBridge(bridgeBin, deviceAddress), BRIDGE_RESTART_DELAY_MS);
  });
}
