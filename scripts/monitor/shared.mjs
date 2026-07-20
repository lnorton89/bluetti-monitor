import { networkInterfaces } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export const DEFAULT_FALLBACK_MAC = process.env.BLUETTI_DEVICE_MAC?.trim().toUpperCase() ?? null;
export const BROKER_URL = "mqtt://127.0.0.1:1883";
export const API_URL = "http://127.0.0.1:8000";
export const DASHBOARD_URL = "http://localhost:8540";
export const LOCAL_DASHBOARD_PORT = 5400;
export const LOCAL_DASHBOARD_URL = `http://127.0.0.1:${LOCAL_DASHBOARD_PORT}`;
export const STACK_READY_TIMEOUT_MS = 90_000;
export const STACK_POLL_INTERVAL_MS = 1_500;
export const DISCOVERY_TIMEOUT_MS = 20_000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getWorkspaceRoot() {
  return resolve(__dirname, "..", "..");
}

export function getApiRoot() {
  return resolve(getWorkspaceRoot(), "api");
}

export function getDashboardRoot() {
  return resolve(getWorkspaceRoot(), "dashboard");
}

export function getDevDataRoot() {
  return resolve(getWorkspaceRoot(), ".dev-data");
}

export function getBinPath(binName) {
  const extension = process.platform === "win32" ? ".exe" : "";
  return join(getWorkspaceRoot(), "node_modules", ".bin", `${binName}${extension}`);
}

export function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export function getDockerCommand() {
  return process.platform === "win32" ? "docker.exe" : "docker";
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

export function spawnAttachedCommand(command, args, options = {}) {
  const { label = command, isolateSignals = false, ...spawnOptions } = options;
  const child = spawn(command, args, {
    cwd: getWorkspaceRoot(),
    stdio: ["inherit", "pipe", "pipe"],
    shell: shouldUseShell(command),
    ...getSignalIsolationOptions(isolateSignals),
    ...spawnOptions,
  });

  pipeOutput(child.stdout, label);
  pipeOutput(child.stderr, label);
  child.once("error", (error) => {
    console.error(`[monitor] Failed to start ${label}:`, error);
  });

  return child;
}

export function getSignalIsolationOptions(isolateSignals, platform = process.platform) {
  return isolateSignals && platform === "win32"
    ? { detached: true, windowsHide: true }
    : {};
}

export async function runAttachedCommand(command, args, options = {}) {
  const child = spawnAttachedCommand(command, args, options);
  const exitCode = await new Promise((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("close", resolvePromise);
  });

  if (exitCode !== 0) {
    const label = options.label ?? command;
    throw new Error(`${label} exited with code ${exitCode}`);
  }
}

export async function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: getWorkspaceRoot(),
    stdio: ["ignore", "pipe", "pipe"],
    shell: shouldUseShell(command),
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
  await runCommand(getDockerCommand(), ["compose", "up", "-d"]);
}

export async function ensureDevBroker() {
  await runCommand(getDockerCommand(), ["compose", "stop", "api", "dashboard"]);
  await runCommand(getDockerCommand(), ["compose", "up", "-d", "mosquitto"]);
}

export async function ensureApiVenv() {
  const apiRoot = getApiRoot();
  const devDataRoot = getDevDataRoot();
  const requirementsPath = resolve(apiRoot, "requirements.txt");
  const venvRoot = resolve(apiRoot, ".venv");
  const venvPythonPath = resolve(
    venvRoot,
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
  const requirementsStampPath = resolve(venvRoot, ".requirements-stamp");
  const requirementsText = readFileSync(requirementsPath, "utf8");
  const stampText = existsSync(requirementsStampPath)
    ? readFileSync(requirementsStampPath, "utf8")
    : null;

  mkdirSync(devDataRoot, { recursive: true });

  if (existsSync(venvPythonPath) && stampText === requirementsText) {
    return venvPythonPath;
  }

  const pythonCommand = await resolvePythonCommand(apiRoot);

  if (!existsSync(venvPythonPath)) {
    await runCommand(pythonCommand[0], [...pythonCommand.slice(1), "-m", "venv", ".venv"], {
      cwd: apiRoot,
    });
  }

  await runCommand(venvPythonPath, ["-m", "pip", "install", "--disable-pip-version-check", "-r", "requirements.txt"], {
    cwd: apiRoot,
  });
  writeFileSync(requirementsStampPath, requirementsText, "utf8");

  return venvPythonPath;
}

export async function resolveDeviceAddress({
  discoveryCommand = getBinPath("bluetti-mqtt-node-discovery"),
  discoveryArgs = [],
} = {}) {

  try {
    const { stdout } = await runCommand(discoveryCommand, discoveryArgs, {
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
    console.warn("[monitor] Discovery did not return a usable device.");
    if (error instanceof Error && error.message) {
      console.warn(error.message);
    }
  }

  if (DEFAULT_FALLBACK_MAC) {
    console.log(`[monitor] Using configured fallback MAC ${DEFAULT_FALLBACK_MAC}.`);
    return { mac: DEFAULT_FALLBACK_MAC, source: "fallback" };
  }

  throw new Error("No supported Bluetti device discovered. Set BLUETTI_DEVICE_MAC to use a known address.");
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

export function stopProcess(child, label) {
  if (!child || child.killed || child.exitCode !== null) {
    return Promise.resolve();
  }

  console.log(`[monitor] Stopping ${label}...`);

  if (process.platform === "win32" && child.pid) {
    return new Promise((resolvePromise) => {
      const killer = spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      killer.once("close", resolvePromise);
      killer.once("error", resolvePromise);
    });
  }

  child.kill("SIGTERM");
  return new Promise((resolvePromise) => {
    child.once("close", resolvePromise);
    setTimeout(resolvePromise, 5_000).unref?.();
  });
}

async function resolvePythonCommand(cwd) {
  const candidates = process.platform === "win32"
    ? [["python"], ["py", "-3"], ["python3"]]
    : [["python3"], ["python"]];

  for (const candidate of candidates) {
    try {
      await runCommand(candidate[0], [...candidate.slice(1), "--version"], { cwd });
      return candidate;
    } catch {
      // Try the next Python launcher.
    }
  }

  throw new Error("Could not find a Python runtime. Install Python 3.12+ to run the API in dev mode.");
}

function pipeOutput(stream, label) {
  if (!stream) {
    return;
  }

  stream.setEncoding("utf8");
  let pending = "";

  stream.on("data", (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`[${label}] ${line}`);
      }
    }
  });

  stream.on("end", () => {
    if (pending.trim().length > 0) {
      console.log(`[${label}] ${pending}`);
      pending = "";
    }
  });
}

function shouldUseShell(command) {
  return process.platform === "win32" && (command.endsWith(".cmd") || command.endsWith(".bat"));
}

function looksLikeBluetti(name) {
  return typeof name === "string" && /bluetti|ac200m|ac300|ac500|ac60|eb3a|ep500p|ep500|ep600/i.test(name);
}
