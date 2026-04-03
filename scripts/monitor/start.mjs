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

const DASHBOARD_READY_MARKER = "<!doctype html>";

let bridgeProcess = null;

async function main() {
  console.log("[monitor] Starting Docker-backed services...");
  await ensureDockerStack();

  await waitForUrl(`${API_URL}/devices`, "api");
  await waitForUrl(DASHBOARD_URL, "dashboard", DASHBOARD_READY_MARKER);

  const device = await resolveDeviceAddress();
  const bridgeBin = getBinPath("bluetti-mqtt-node");
  console.log(`[monitor] Starting bluetti-mqtt-node via package CLI for ${device.mac}...`);

  bridgeProcess = spawnCommand(bridgeBin, ["--broker", BROKER_URL, device.mac], {
    env: { ...process.env },
  });

  bridgeProcess.once("close", (exitCode) => {
    if (exitCode !== 0) {
      console.error(`[monitor] bluetti-mqtt-node exited with code ${exitCode}.`);
      process.exitCode = exitCode ?? 1;
    }
  });

  printDashboardUrls();
  console.log(`[monitor] API: ${API_URL}`);
  console.log(`[monitor] Device source: ${device.source}`);
  console.log("[monitor] Press Ctrl+C to stop the host bridge. Docker services stay up.");
}

installSignalHandlers(async () => {
  if (bridgeProcess && !bridgeProcess.killed) {
    bridgeProcess.kill();
  }
});

main().catch((error) => {
  console.error("[monitor] Failed to start monitor:", error);
  process.exit(1);
});
