import {
  API_URL,
  BROKER_URL,
  DASHBOARD_URL,
  ensureDockerStack,
  getBinPath,
  resolveDeviceAddress,
  runCommand,
  sleep,
  waitForUrl,
} from "./shared.mjs";

const API_POLL_TIMEOUT_MS = 30_000;
const API_POLL_INTERVAL_MS = 1_500;

async function main() {
  console.log("[monitor:verify] Ensuring Docker-backed services are running...");
  await ensureDockerStack();
  await waitForUrl(`${API_URL}/devices`, "api");
  await waitForUrl(DASHBOARD_URL, "dashboard");

  const beforeStatus = await fetchJson(`${API_URL}/status`);
  const beforeSnapshot = JSON.stringify(beforeStatus);
  const device = await resolveDeviceAddress();
  const bridgeBin = getBinPath("bluetti-mqtt-node");

  console.log(`[monitor:verify] Running one-shot bridge publish for ${device.mac}...`);
  await runCommand(bridgeBin, ["--broker", BROKER_URL, "--once", device.mac], {
    env: { ...process.env },
  });

  const updatedStatus = await waitForDeviceData(beforeSnapshot);
  const devices = Object.keys(updatedStatus);

  console.log("[monitor:verify] Verification passed.");
  console.log(`[monitor:verify] Dashboard reachable: ${DASHBOARD_URL}`);
  console.log(`[monitor:verify] API reachable: ${API_URL}`);
  console.log(`[monitor:verify] Devices visible via API: ${devices.join(", ")}`);
}

async function waitForDeviceData(beforeSnapshot) {
  const deadline = Date.now() + API_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const status = await fetchJson(`${API_URL}/status`);
    const statusKeys = Object.keys(status);
    const snapshot = JSON.stringify(status);

    if (statusKeys.length > 0 && snapshot !== beforeSnapshot) {
      return status;
    }

    const devices = await fetchJson(`${API_URL}/devices`);
    if (Array.isArray(devices) && devices.length > 0 && snapshot !== beforeSnapshot) {
      return status;
    }

    await sleep(API_POLL_INTERVAL_MS);
  }

  throw new Error(
    "The API did not show updated device data after the one-shot bridge publish. Check Docker, Bluetooth, and the device connection.",
  );
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

main().catch((error) => {
  console.error("[monitor:verify] Verification failed:", error);
  process.exit(1);
});
