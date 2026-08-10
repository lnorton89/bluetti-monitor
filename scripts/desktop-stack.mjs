import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { acquireMonitorLock, releaseMonitorLock } from "./lock.mjs";

/**
 * Self-contained monitor-stack starter bundled into the installed desktop
 * app (see electrobun.config.ts's `copy` map and
 * scripts/electrobun-prebuild-vendor.mjs). Deliberately independent of
 * scripts/monitor/shared.mjs: this runs from inside the packaged app
 * bundle, not a dev checkout, so it resolves the bundled bridge directly by
 * path instead of through npm workspace/.bin resolution.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
// Flat bundled files (see electrobun-prebuild-vendor.mjs), not a raw
// node_modules tree - Electrobun's self-extractor can't handle the deep
// nesting a real npm install produces.
const bridgeCli = join(appRoot, "vendor", "bridge-dist", "bluetti-mqtt.js");
const discoveryCli = join(appRoot, "vendor", "bridge-dist", "bluetti-discovery.js");
const bridgeHelperPath = join(appRoot, "vendor", "bridge-helper", "BluettiMqtt.BluetoothHelper.exe");

const DOCKER_COMMAND = process.platform === "win32" ? "docker.exe" : "docker";
// docker compose defaults its project name (and therefore its image tags,
// e.g. bluetti-monitor-api) to the containing folder name. Run from inside
// the app bundle that would be "app", producing different image tags than
// the dev checkout's builds and forcing a rebuild from ./api and
// ./dashboard - which aren't bundled. Pinning the project name reuses the
// images already built from the dev checkout instead.
const COMPOSE_PROJECT_NAME = "bluetti-monitor";
const BROKER_URL = "mqtt://127.0.0.1:1883";
const API_URL = "http://127.0.0.1:8000";
const DASHBOARD_URL = "http://localhost:8540";
const DASHBOARD_READY_MARKER = "<!doctype html>";
const STACK_READY_TIMEOUT_MS = 90_000;
const STACK_POLL_INTERVAL_MS = 1_500;
const DISCOVERY_TIMEOUT_MS = 20_000;
const BRIDGE_RESTART_DELAY_MS = 5_000;
const DEFAULT_FALLBACK_MAC = process.env.BLUETTI_DEVICE_MAC?.trim().toUpperCase() ?? null;

let bridgeProcess = null;
let stopping = false;

async function main() {
  if (!existsSync(bridgeCli)) {
    throw new Error(`Bundled bridge CLI not found at ${bridgeCli}`);
  }
  if (!existsSync(bridgeHelperPath)) {
    throw new Error(`Bundled BLE helper not found at ${bridgeHelperPath}`);
  }

  const lock = acquireMonitorLock("desktop-self-start");
  if (!lock.acquired) {
    console.log(
      `[desktop-stack] Monitor stack already managed by pid ${lock.existing.pid} (${lock.existing.label}); not starting a second bridge.`,
    );
    return;
  }

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  console.log("[desktop-stack] Starting Docker-backed services...");
  await runCommand(DOCKER_COMMAND, ["compose", "-p", COMPOSE_PROJECT_NAME, "up", "-d"], { cwd: appRoot });

  await waitForUrl(`${API_URL}/devices`, "api");
  await waitForUrl(DASHBOARD_URL, "dashboard", DASHBOARD_READY_MARKER);

  const device = await resolveDeviceAddress();
  console.log(`[desktop-stack] Starting bundled bridge for ${device.mac} (${device.source})...`);
  startBridge(device.mac);
}

function shutdown() {
  stopping = true;
  if (bridgeProcess && !bridgeProcess.killed) {
    bridgeProcess.kill();
  }
  releaseMonitorLock();
  process.exit(0);
}

function startBridge(address) {
  if (stopping) return;

  bridgeProcess = spawn(process.execPath, [bridgeCli, "--broker", BROKER_URL, address], {
    cwd: appRoot,
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env, BLUETTI_HELPER_PATH: bridgeHelperPath },
  });

  bridgeProcess.once("close", (code) => {
    if (stopping) return;
    console.error(
      `[desktop-stack] bridge exited with code ${code}; restarting in ${BRIDGE_RESTART_DELAY_MS}ms.`,
    );
    setTimeout(() => startBridge(address), BRIDGE_RESTART_DELAY_MS);
  });
}

async function resolveDeviceAddress() {
  try {
    const stdout = await runCommandCapture(process.execPath, [discoveryCli], {
      cwd: appRoot,
      timeoutMs: DISCOVERY_TIMEOUT_MS,
      env: { ...process.env, BLUETTI_HELPER_PATH: bridgeHelperPath },
    });
    const devices = JSON.parse(stdout);
    const match = Array.isArray(devices)
      ? devices.find((device) => looksLikeBluetti(device?.name) && typeof device?.address === "string")
      : undefined;

    if (match?.address) {
      return { mac: match.address.toUpperCase(), source: "discovery" };
    }
  } catch (error) {
    console.warn("[desktop-stack] Discovery did not return a usable device.", error?.message ?? error);
  }

  if (DEFAULT_FALLBACK_MAC) {
    return { mac: DEFAULT_FALLBACK_MAC, source: "fallback" };
  }

  throw new Error("No supported Bluetti device discovered. Set BLUETTI_DEVICE_MAC to use a known address.");
}

function looksLikeBluetti(name) {
  return typeof name === "string" && /bluetti|ac200m|ac300|ac500|ac60|eb3a|ep500p|ep500|ep600/i.test(name);
}

function runCommand(command, args, options) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false, windowsHide: true, ...options });
    child.once("error", reject);
    child.once("close", (code) => {
      code === 0 ? resolvePromise() : reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function runCommandCapture(command, args, { cwd, timeoutMs, env }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
      env: env ?? process.env,
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`${command} ${args.join(" ")} timed out`));
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      code === 0 ? resolvePromise(stdout) : reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function waitForUrl(url, label, expectedText) {
  const deadline = Date.now() + STACK_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await isUrlReady(url, expectedText)) {
      return;
    }
    await sleep(STACK_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}.`);
}

async function isUrlReady(url, expectedText) {
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

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

main().catch((error) => {
  console.error("[desktop-stack] Failed to start monitor stack:", error);
  releaseMonitorLock();
  process.exitCode = 1;
});
