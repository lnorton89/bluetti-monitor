import {
  API_URL,
  BROKER_URL,
  LOCAL_DASHBOARD_PORT,
  LOCAL_DASHBOARD_URL,
  ensureApiVenv,
  ensureDevBroker,
  getApiRoot,
  getBinPath,
  getDashboardRoot,
  getDevDataRoot,
  getNpmCommand,
  installSignalHandlers,
  resolveDeviceAddress,
  spawnAttachedCommand,
  stopProcess,
  waitForUrl,
} from "./shared.mjs";
import { resolve } from "node:path";

const DASHBOARD_READY_MARKER = '<div id="root"></div>';

const childProcesses = [];

async function main() {
  console.log("[monitor:dev] Starting local development monitor stack...");
  await ensureDevBroker();

  const apiPython = await ensureApiVenv();
  const apiProcess = spawnAttachedCommand(
    apiPython,
    ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
    {
      cwd: getApiRoot(),
      env: {
        ...process.env,
        MQTT_HOST: "127.0.0.1",
        MQTT_PORT: "1883",
        DB_PATH: resolve(getDevDataRoot(), "bluetti-dev.db"),
      },
      label: "monitor:api",
    },
  );
  childProcesses.push({ child: apiProcess, label: "api" });
  await waitForUrl(`${API_URL}/devices`, "api");

  const dashboardProcess = spawnAttachedCommand(
    getNpmCommand(),
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(LOCAL_DASHBOARD_PORT)],
    {
      cwd: getDashboardRoot(),
      env: {
        ...process.env,
        VITE_API_URL: API_URL,
        VITE_WS_URL: "ws://127.0.0.1:8000/ws",
      },
      label: "monitor:dashboard",
    },
  );
  childProcesses.push({ child: dashboardProcess, label: "dashboard" });
  await waitForUrl(LOCAL_DASHBOARD_URL, "dashboard", DASHBOARD_READY_MARKER);

  const device = await resolveDeviceAddress();
  const bridgeBin = getBinPath("bluetti-mqtt-node");
  console.log(`[monitor:dev] Starting bluetti-mqtt-node via package CLI for ${device.mac}...`);
  const bridgeProcess = spawnAttachedCommand(bridgeBin, ["--broker", BROKER_URL, device.mac], {
    env: { ...process.env },
    label: "monitor:bridge",
  });
  childProcesses.push({ child: bridgeProcess, label: "bridge" });

  for (const { child, label } of childProcesses) {
    child.once("close", (exitCode) => {
      if (exitCode !== 0) {
        console.error(`[monitor:dev] ${label} exited with code ${exitCode}.`);
        process.exitCode = exitCode ?? 1;
      }
    });
  }

  console.log(`[monitor:dev] Dashboard: ${LOCAL_DASHBOARD_URL}`);
  console.log(`[monitor:dev] API: ${API_URL}`);
  console.log(`[monitor:dev] Device source: ${device.source}`);
  console.log("[monitor:dev] Press Ctrl+C to stop local API, dashboard, and bridge processes.");
}

installSignalHandlers(async () => {
  stopChildProcesses();
});

main().catch((error) => {
  console.error("[monitor:dev] Failed to start local development monitor stack:", error);
  stopChildProcesses();
  process.exit(1);
});

function stopChildProcesses() {
  for (const { child, label } of childProcesses.toReversed()) {
    stopProcess(child, label);
  }
}
