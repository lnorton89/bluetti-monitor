import { networkInterfaces } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

export const DEFAULT_FALLBACK_MAC = "24:4C:AB:2C:24:8E";
export const BROKER_URL = "mqtt://127.0.0.1:1883";
export const API_URL = "http://127.0.0.1:8000";
export const DASHBOARD_URL = "http://localhost:8540";
export const STACK_READY_TIMEOUT_MS = 90_000;
export const STACK_POLL_INTERVAL_MS = 1_500;
export const DISCOVERY_TIMEOUT_MS = 20_000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getWorkspaceRoot() {
  return resolve(__dirname, "..", "..");
}

export function getBinPath(binName) {
  const extension = process.platform === "win32" ? ".exe" : "";
  return join(getWorkspaceRoot(), "node_modules", ".bin", `${binName}${extension}`);
}

export function spawnCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: getWorkspaceRoot(),
    stdio: "inherit",
    shell: false,
    ...options,
  });

  child.once("error", (error) => {
    console.error(`[monitor] Failed to start ${command}:`, error);
  });

  return child;
}

export async function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: getWorkspaceRoot(),
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    ...options,
  });

  let stdout = "";
  let stderr = "";

  child.stdout?.on("data", (chunk) => {
    stdout += String(chunk);
  });

  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const exitCode = await new Promise((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("close", resolvePromise);
  });

  if (exitCode !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with code ${exitCode}.\n${stderr.trim() || stdout.trim()}`.trim(),
    );
  }

  return { stdout, stderr };
}

export async function waitForUrl(url, label, expectedText) {
  const deadline = Date.now() + STACK_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await isUrlReady(url, expectedText)) {
      return;
    }

    await sleep(STACK_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}.`);
}

export async function isUrlReady(url, expectedText) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_500) });
    if (!response.ok) {
      return false;
    }

    if (!expectedText) {
      return true;
    }

    const body = await response.text();
    return body.includes(expectedText);
  } catch {
    return false;
  }
}

export async function ensureDockerStack() {
  const dockerCommand = process.platform === "win32" ? "docker.exe" : "docker";
  await runCommand(dockerCommand, ["compose", "up", "-d"]);
}

export async function resolveDeviceAddress() {
  const discoveryBin = getBinPath("bluetti-mqtt-node-discovery");

  try {
    const { stdout } = await runCommand(discoveryBin, [], {
      env: { ...process.env },
      timeout: DISCOVERY_TIMEOUT_MS,
    });

    const devices = JSON.parse(stdout);
    const match = Array.isArray(devices)
      ? devices.find((device) => looksLikeBluetti(device?.name) && typeof device?.address === "string")
      : undefined;

    if (match?.address) {
      const mac = match.address.toUpperCase();
      console.log(`[monitor] Discovered ${match.name || "Bluetti device"} at ${mac}.`);
      return { mac, source: "discovery" };
    }
  } catch (error) {
    console.warn("[monitor] Discovery did not return a usable device, falling back to known MAC.");
    if (error instanceof Error && error.message) {
      console.warn(error.message);
    }
  }

  console.log(`[monitor] Using fallback MAC ${DEFAULT_FALLBACK_MAC}.`);
  return { mac: DEFAULT_FALLBACK_MAC, source: "fallback" };
}

export function getLanUrls() {
  const urls = new Set();
  const interfaces = networkInterfaces();

  for (const details of Object.values(interfaces)) {
    for (const entry of details ?? []) {
      if (entry.family !== "IPv4" || entry.internal) {
        continue;
      }

      urls.add(`http://${entry.address}:8540`);
    }
  }

  return [...urls];
}

export function printDashboardUrls() {
  console.log("[monitor] Dashboard URLs:");
  console.log(`  Local: ${DASHBOARD_URL}`);

  for (const url of getLanUrls()) {
    console.log(`  LAN:   ${url}`);
  }
}

export function installSignalHandlers(cleanup) {
  const wrapped = async () => {
    try {
      await cleanup();
    } finally {
      process.exit(0);
    }
  };

  process.once("SIGINT", wrapped);
  process.once("SIGTERM", wrapped);
}

export function sleep(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function looksLikeBluetti(name) {
  return typeof name === "string" && /bluetti|ac500/i.test(name);
}
