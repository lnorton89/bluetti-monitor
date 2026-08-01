import {
  API_URL,
  LOCAL_DASHBOARD_PORT,
  LOCAL_DASHBOARD_URL,
  ensureApiVenv,
  ensureDevBroker,
  getApiRoot,
  getDashboardRoot,
  getDevDataRoot,
  getLocalBinScriptPath,
  installSignalHandlers,
  spawnAttachedCommand,
  stopProcess,
  waitForUrl,
} from "./shared.mjs";
import { resolve } from "node:path";
import { createBridgeDevSupervisor } from "./bridge-dev.mjs";

const DASHBOARD_READY_MARKER = '<div id="root"></div>';

const childProcesses = [];
let stopping = false;
let bridgeSupervisor = null;

async function main() {
  console.log("[monitor:dev] Starting local development monitor stack...");
  await ensureDevBroker();

  bridgeSupervisor = createBridgeDevSupervisor();
  await bridgeSupervisor.start();

  const apiPython = await ensureApiVenv();
  const apiArgs = process.platform === "win32"
    ? [resolve(getApiRoot(), "dev_server.py")]
    : ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"];
  const apiProcess = spawnAttachedCommand(
    apiPython,
    apiArgs,
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
  await waitForUrl(`${API_URL}/status`, "api");

  const dashboardProcess = spawnAttachedCommand(
    process.execPath,
    [
      getLocalBinScriptPath(getDashboardRoot(), "vite"),
      "--host", "127.0.0.1", "--port", String(LOCAL_DASHBOARD_PORT),
    ],
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
  console.log("[monitor:dev] Real AC500 bridge discovery/reconnect runs continuously in the background.");
  console.log("[monitor:dev] Press Ctrl+C to stop local API, dashboard, and bridge processes.");
}

installSignalHandlers(async () => {
  await stopChildProcesses();
});

main().catch(async (error) => {
  console.error("[monitor:dev] Failed to start local development monitor stack:", error);
  await stopChildProcesses();
  process.exit(1);
});

async function stopChildProcesses() {
  if (stopping) return;
  stopping = true;
  await bridgeSupervisor?.stop();
  bridgeSupervisor = null;
  const stops = [];
  for (const { child, label } of childProcesses.toReversed()) {
    stops.push(stopProcess(child, label));
  }
  await Promise.allSettled(stops);
}
