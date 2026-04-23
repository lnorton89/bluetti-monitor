import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { BrowserWindow } from "electrobun/bun";
import { Utils } from "electrobun/bun";
import {
  discoverBluettiDevice,
  startBluettiMqttService as launchBluettiMqttService,
  type BluettiMqttService,
} from "./bluetooth";
import { buildWindowTitle, type AllState } from "./titlebar";

const API_URL = "http://127.0.0.1:8000";
const LOCAL_DASHBOARD_PORT = 5173;
const LOCAL_DASHBOARD_URL = `http://127.0.0.1:${LOCAL_DASHBOARD_PORT}`;
const PROD_DASHBOARD_URL = "http://127.0.0.1:8540";
const STACK_READY_TIMEOUT_MS = 90_000;
const STACK_POLL_INTERVAL_MS = 1_500;
const PROD_STACK_COMMAND = ["docker", "compose", "up", "-d"];
const DEV_BROKER_COMMAND = ["docker", "compose", "up", "-d", "mosquitto"];
const DEV_STOP_CONTAINERS_COMMAND = ["docker", "compose", "stop", "api", "dashboard"];
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const DASHBOARD_READY_MARKER = '<div id="root"></div>';
const DESKTOP_NOTIFICATION_SUBTITLE = "Bluetti Monitor";
const TITLEBAR_RECONNECT_DELAY_MS = 1_500;
const LOG_DIR_NAME = "logs";
const DESKTOP_LOG_FILE_NAME = "desktop.log";
const DESKTOP_SETTINGS_FILE_NAME = "desktop-settings.json";
const LOG_TRUNCATE_BYTES_OPTIONS = [512 * 1024, 1_024 * 1_024, 5 * 1_024 * 1_024, 10 * 1_024 * 1_024] as const;
const LOG_RETAIN_BYTES_OPTIONS = [128 * 1_024, 256 * 1_024, 512 * 1_024, 1_024 * 1_024] as const;
const ANSI_ESCAPE_PATTERN = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g;
const MAX_LOG_CONTEXT_FIELDS = 14;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const appRoot = findWorkspaceRoot();
const apiRoot = resolve(appRoot, "api");
const dashboardRoot = resolve(appRoot, "dashboard");
const devDataRoot = resolve(appRoot, ".dev-data");
const logDir = resolve(devDataRoot, LOG_DIR_NAME);
const desktopLogPath = resolve(logDir, DESKTOP_LOG_FILE_NAME);
const desktopSettingsPath = resolve(devDataRoot, DESKTOP_SETTINGS_FILE_NAME);
const devDatabasePath = resolve(devDataRoot, "bluetti-dev.db");
const apiRequirementsPath = resolve(apiRoot, "requirements.txt");
const apiVenvRoot = resolve(apiRoot, ".venv");
const apiVenvPythonPath = resolve(
  apiVenvRoot,
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const apiRequirementsStampPath = resolve(apiVenvRoot, ".requirements-stamp");
const isLocalDev = existsSync(resolve(appRoot, "dashboard", "package.json"))
  && existsSync(resolve(appRoot, "api", "main.py"));

let bluettiMqttService: BluettiMqttService | null = null;
let apiProcess: Bun.Subprocess | null = null;
let dashboardProcess: Bun.Subprocess | null = null;
let titlebarSocket: WebSocket | null = null;
let titlebarState: AllState = {};
let isShuttingDown = false;
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

type TitlebarSnapshotMessage = {
  type: "snapshot";
  data: AllState;
};

type TitlebarUpdateMessage = {
  device: string;
  field: string;
  value: string;
  ts: string;
};

const mainWindow = new BrowserWindow({
  title: "Bluetti Monitor",
  url: "views://mainview/index.html",
  frame: {
    width: 1500,
    height: 960,
    x: 120,
    y: 80,
  },
});

type BatteryFullHostMessage = {
  body?: string;
  silent?: boolean;
  subtitle?: string;
  title?: string;
  type?: string;
};

type DesktopLogSettings = {
  enabled: boolean;
  retainBytes: number;
  truncateAtBytes: number;
};

type DesktopLogSettingsHostMessage = {
  enabled?: unknown;
  retainBytes?: unknown;
  truncateAtBytes?: unknown;
  type?: string;
};

const DEFAULT_DESKTOP_LOG_SETTINGS: DesktopLogSettings = {
  enabled: true,
  truncateAtBytes: 1_024 * 1_024,
  retainBytes: 256 * 1_024,
};

let desktopLogSettings = loadDesktopLogSettings();

const desktopHostEvents = mainWindow.webview as typeof mainWindow.webview & {
  on: (name: "host-message", handler: (event: { data?: { detail?: unknown } }) => void) => void;
};

desktopHostEvents.on("host-message", (event: { data?: { detail?: unknown } }) => {
  const detail = event.data?.detail;

  if (!detail || typeof detail !== "object") {
    return;
  }

  const message = detail as BatteryFullHostMessage | DesktopLogSettingsHostMessage;

  if (message.type === "desktop-log-settings") {
    updateDesktopLogSettings(message);
    return;
  }

  if (!isBatteryFullHostMessage(message)) {
    return;
  }

  Utils.showNotification({
    title: message.title,
    body: message.body,
    subtitle: message.subtitle ?? DESKTOP_NOTIFICATION_SUBTITLE,
    silent: message.silent,
  });
});

mainWindow.setTitle(buildWindowTitle(titlebarState));
initializeDesktopLogging();

function nudgeLoadedWebview() {
  mainWindow.webview.executeJavascript(`
    (() => {
      const fireResize = () => window.dispatchEvent(new Event('resize'));
      fireResize();
      setTimeout(fireResize, 50);
      setTimeout(fireResize, 150);
      setTimeout(fireResize, 400);
      setTimeout(() => {
        window.dispatchEvent(new Event('orientationchange'));
        fireResize();
      }, 800);
    })();
  `);

  const { width, height } = mainWindow.getSize();
  if (width > 200 && height > 200) {
    mainWindow.setSize(width - 1, height - 1);
    setTimeout(() => {
      mainWindow.setSize(width, height);
    }, 32);
  }
}

function scheduleWebviewNudges() {
  const delays = [80, 220, 600, 1200];
  for (const delay of delays) {
    setTimeout(() => {
      nudgeLoadedWebview();
    }, delay);
  }
}

mainWindow.webview.on("dom-ready", () => {
  nudgeLoadedWebview();
});

mainWindow.webview.on("did-navigate", () => {
  nudgeLoadedWebview();
});

async function streamProcessOutput(stream: ReadableStream<Uint8Array> | null, label: string) {
  if (!stream) {
    return;
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const text = decoder.decode(value, { stream: true }).trim();
    if (text) {
      console.log(`[desktop:${label}] ${text}`);
    }
  }
}

function initializeDesktopLogging() {
  if (desktopLogSettings.enabled) {
    mkdirSync(logDir, { recursive: true });
    ensureDesktopLogWithinBudget();
    appendDesktopLogLine(`[desktop] log capture started at ${new Date().toISOString()}`);
  }

  console.log = (...args: unknown[]) => {
    writeConsoleLine("INFO", originalConsole.log, args);
  };
  console.info = (...args: unknown[]) => {
    writeConsoleLine("INFO", originalConsole.info, args);
  };
  console.warn = (...args: unknown[]) => {
    writeConsoleLine("WARN", originalConsole.warn, args);
  };
  console.error = (...args: unknown[]) => {
    writeConsoleLine("ERROR", originalConsole.error, args);
  };
}

function writeConsoleLine(level: "INFO" | "WARN" | "ERROR", writer: (...args: unknown[]) => void, args: unknown[]) {
  const lines = formatLogLines(args);
  for (const line of lines) {
    writer(line);
    appendDesktopLogLine(`[${resolveDesktopLogLevel(level, line)}] ${line}`);
  }
}

function formatLogLines(args: unknown[]): string[] {
  const combined = args
    .flatMap((arg) => formatLogArg(arg))
    .flatMap((chunk) => splitLogLines(chunk));

  return combined.length > 0 ? combined : ["(empty log line)"];
}

function formatLogArg(value: unknown): string[] {
  if (typeof value === "string") {
    // Try to parse as JSON log payload (from bluetti-mqtt-node library)
    const parsed = tryParseJsonLog(value);
    if (parsed !== null && isStructuredLogPayload(parsed)) {
      return [formatStructuredLogPayload(parsed)];
    }
    return [formatLogText(value)];
  }

  if (value instanceof Error) {
    return splitLogLines(value.stack ?? `${value.name}: ${value.message}`);
  }

  if (isStructuredLogPayload(value)) {
    return [formatStructuredLogPayload(value)];
  }

  try {
    return [formatLogText(JSON.stringify(value))];
  } catch {
    return [formatLogText(String(value))];
  }
}

// Helper to try parsing a string as JSON, returning null if invalid
function tryParseJsonLog(value: string): unknown {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function splitLogLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => formatLogText(line))
    .filter((line) => line.length > 0);
}

function formatLogText(value: string): string {
  return value.replace(ANSI_ESCAPE_PATTERN, "").replace(/\s+/g, " ").trim();
}

function isStructuredLogPayload(value: unknown): value is {
  context?: unknown;
  level?: unknown;
  message: string;
  timestamp?: unknown;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record["message"] === "string";
}

function formatStructuredLogPayload(payload: {
  context?: unknown;
  level?: unknown;
  message: string;
  timestamp?: unknown;
}) {
  if (isCompactPollingMessage(payload.message)) {
    if (payload.message === "Polling cycle completed") {
      const compact = formatCompactPollingCycle(payload.context);
      if (compact !== null) {
        return compact;
      }
    }

    if (payload.message === "Polling telemetry summary") {
      const compact = formatCompactTelemetrySummary(payload.context);
      if (compact !== null) {
        return compact;
      }
    }
  }

  const context = formatGroupedContext(payload.context);

  return context.length > 0
    ? `${payload.message} | ${context.join(" | ")}`
    : payload.message;
}

function formatGroupedContext(context: unknown): string[] {
  if (typeof context !== "object" || context === null) {
    return [];
  }

  const entries = Object.entries(context as Record<string, unknown>);
  const fields: string[] = [];

  for (const [key, value] of entries) {
    if (value === null || value === undefined) {
      continue;
    }

    if (isIsoTimestamp(value)) {
      continue;
    }

    if (isNonTrivialObject(value)) {
      const inner = formatGroupedEntries(value as Record<string, unknown>);
      if (inner.length > 0) {
        fields.push(`${key}: { ${inner.join(" ")} }`);
      }
      continue;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      fields.push(`${key}=${value}`);
      continue;
    }

    if (Array.isArray(value)) {
      const rendered = value.map((entry) => renderLogScalar(entry)).filter((entry) => entry.length > 0);
      if (rendered.length > 0) {
        fields.push(`${key}=${rendered.join(",")}`);
      }
      continue;
    }

    fields.push(`${key}=${String(value)}`);
  }

  if (fields.length <= MAX_LOG_CONTEXT_FIELDS) {
    return fields;
  }

  return [
    ...fields.slice(0, MAX_LOG_CONTEXT_FIELDS),
    `... +${fields.length - MAX_LOG_CONTEXT_FIELDS} more`,
  ];
}

function formatGroupedEntries(record: Record<string, unknown>): string[] {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (isIsoTimestamp(value)) {
      continue;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      parts.push(`${key}=${value}`);
      continue;
    }

    if (Array.isArray(value)) {
      const rendered = value.map((entry) => renderLogScalar(entry)).filter((entry) => entry.length > 0);
      if (rendered.length > 0) {
        parts.push(`${key}=${rendered.join(",")}`);
      }
      continue;
    }

    if (typeof value === "object" && value !== null) {
      const nested = formatGroupedEntries(value as Record<string, unknown>);
      if (nested.length > 0) {
        parts.push(`${key}: { ${nested.join(" ")} }`);
      }
      continue;
    }

    parts.push(`${key}=${String(value)}`);
  }

  return parts;
}

function isNonTrivialObject(value: unknown): boolean {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.keys(value as Record<string, unknown>).length >= 3
  );
}

function isIsoTimestamp(value: unknown): boolean {
  return typeof value === "string" && ISO_TIMESTAMP_PATTERN.test(value);
}

function isCompactPollingMessage(message: string): boolean {
  return message === "Polling cycle completed" || message === "Polling telemetry summary";
}

function formatCompactPollingCycle(context: unknown): string | null {
  if (typeof context !== "object" || context === null) {
    return null;
  }

  const record = context as Record<string, unknown>;
  const cycleType = record["cycleType"];
  const result = record["result"];
  const commandCount = record["commandCount"];
  const cycleDurationMs = record["cycleDurationMs"];
  const telemetry = record["telemetry"];

  if (
    typeof cycleType !== "string"
    || typeof result !== "string"
    || typeof commandCount !== "number"
    || typeof cycleDurationMs !== "number"
  ) {
    return null;
  }

  const cycleSegment = `${cycleType} ${result} ${commandCount}cmds ${cycleDurationMs}ms`;

  if (typeof telemetry !== "object" || telemetry === null) {
    return null;
  }

  const tel = telemetry as Record<string, unknown>;
  const cycleCount = tel["cycleCount"];
  const successfulCommandCount = tel["successfulCommandCount"];
  const expectedErrorCount = tel["expectedErrorCount"];
  const busyErrorCount = tel["busyErrorCount"];

  if (typeof cycleCount !== "number" || typeof successfulCommandCount !== "number") {
    return null;
  }

  const telemetryParts = [`#${cycleCount} ${successfulCommandCount}ok`];

  if (typeof expectedErrorCount === "number" && expectedErrorCount > 0) {
    telemetryParts.push(`${expectedErrorCount}err`);
  }

  if (typeof busyErrorCount === "number" && busyErrorCount > 0) {
    telemetryParts.push(`${busyErrorCount}busy`);
  }

  return `Polling cycle completed | ${cycleSegment} | ${telemetryParts.join(" ")}`;
}

function formatCompactTelemetrySummary(context: unknown): string | null {
  if (typeof context !== "object" || context === null) {
    return null;
  }

  const record = context as Record<string, unknown>;
  const address = record["address"];
  const fastIntervalMs = record["fastIntervalMs"];
  const fullIntervalMs = record["fullIntervalMs"];
  const commandDelayMs = record["commandDelayMs"];
  const telemetry = record["telemetry"];

  if (
    typeof address !== "string"
    || typeof fastIntervalMs !== "number"
    || typeof fullIntervalMs !== "number"
    || typeof commandDelayMs !== "number"
    || typeof telemetry !== "object"
    || telemetry === null
  ) {
    return null;
  }

  const tel = telemetry as Record<string, unknown>;
  const cycleCount = tel["cycleCount"];
  const fastCycleCount = tel["fastCycleCount"];
  const fullCycleCount = tel["fullCycleCount"];
  const successfulCommandCount = tel["successfulCommandCount"];
  const expectedErrorCount = tel["expectedErrorCount"];
  const busyErrorCount = tel["busyErrorCount"];
  const commandWriteCount = tel["commandWriteCount"];
  const parserPublishCount = tel["parserPublishCount"];
  const averageCycleDurationMs = tel["averageCycleDurationMs"];
  const averageCommandDurationMs = tel["averageCommandDurationMs"];
  const maxCycleDurationMs = tel["maxCycleDurationMs"];
  const maxCommandDurationMs = tel["maxCommandDurationMs"];

  if (
    typeof cycleCount !== "number"
    || typeof fastCycleCount !== "number"
    || typeof fullCycleCount !== "number"
    || typeof successfulCommandCount !== "number"
    || typeof expectedErrorCount !== "number"
    || typeof busyErrorCount !== "number"
    || typeof commandWriteCount !== "number"
    || typeof parserPublishCount !== "number"
    || typeof averageCycleDurationMs !== "number"
    || typeof averageCommandDurationMs !== "number"
    || typeof maxCycleDurationMs !== "number"
    || typeof maxCommandDurationMs !== "number"
  ) {
    return null;
  }

  const telemetryParts = [
    `${address}`,
    `${cycleCount} cycles (${fastCycleCount} fast/${fullCycleCount} full)`,
    `${successfulCommandCount} ok`,
  ];

  if (expectedErrorCount > 0) {
    telemetryParts.push(`${expectedErrorCount} err`);
  }

  if (busyErrorCount > 0) {
    telemetryParts.push(`${busyErrorCount} busy`);
  }

  if (commandWriteCount > 0) {
    telemetryParts.push(`${commandWriteCount} writes`);
  }

  if (parserPublishCount > 0) {
    telemetryParts.push(`${parserPublishCount} pub`);
  }

  telemetryParts.push(
    `${fastIntervalMs}ms fast/${fullIntervalMs}ms full/${commandDelayMs}ms delay`,
    `${averageCycleDurationMs}ms avg cycle/${averageCommandDurationMs}ms avg cmd`,
    `${maxCycleDurationMs}ms max cycle/${maxCommandDurationMs}ms max cmd`,
  );

  return `Polling telemetry summary | ${telemetryParts.join(" | ")}`;
}

function renderLogScalar(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return formatLogText(JSON.stringify(value));
}

function appendDesktopLogLine(line: string) {
  if (!desktopLogSettings.enabled) {
    return;
  }

  try {
    mkdirSync(logDir, { recursive: true });
    ensureDesktopLogWithinBudget();
    appendFileSync(desktopLogPath, `${new Date().toISOString()} ${line}\n`, "utf8");
  } catch (error) {
    originalConsole.error("[desktop:log] failed to append desktop log", error);
  }
}

function resolveDesktopLogLevel(
  fallbackLevel: "INFO" | "WARN" | "ERROR",
  text: string,
): "DEBUG" | "INFO" | "WARN" | "ERROR" {
  try {
    const payload = JSON.parse(text) as { level?: unknown };
    switch (payload.level) {
      case "debug":
        return "DEBUG";
      case "info":
        return "INFO";
      case "warn":
        return "WARN";
      case "error":
        return "ERROR";
      default:
        return fallbackLevel;
    }
  } catch {
    return fallbackLevel;
  }
}

function ensureDesktopLogWithinBudget() {
  if (!desktopLogSettings.enabled) {
    return;
  }

  if (!existsSync(desktopLogPath)) {
    return;
  }

  const { size } = statSync(desktopLogPath);
  if (size <= desktopLogSettings.truncateAtBytes) {
    return;
  }

  const buffer = readFileSync(desktopLogPath);
  const retained = buffer.subarray(Math.max(0, buffer.length - desktopLogSettings.retainBytes));
  writeFileSync(desktopLogPath, new Uint8Array(retained));
  appendFileSync(
    desktopLogPath,
    `${new Date().toISOString()} [desktop] log truncated after exceeding ${desktopLogSettings.truncateAtBytes} bytes\n`,
    "utf8",
  );
}

function loadDesktopLogSettings(): DesktopLogSettings {
  try {
    if (!existsSync(desktopSettingsPath)) {
      return DEFAULT_DESKTOP_LOG_SETTINGS;
    }

    const raw = readFileSync(desktopSettingsPath, "utf8");
    return sanitizeDesktopLogSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_DESKTOP_LOG_SETTINGS;
  }
}

function sanitizeDesktopLogSettings(candidate: unknown): DesktopLogSettings {
  if (typeof candidate !== "object" || candidate === null) {
    return DEFAULT_DESKTOP_LOG_SETTINGS;
  }

  const record = candidate as Record<string, unknown>;
  const truncateAtBytes = sanitizeAllowedNumber(
    record["truncateAtBytes"],
    LOG_TRUNCATE_BYTES_OPTIONS,
    DEFAULT_DESKTOP_LOG_SETTINGS.truncateAtBytes,
  );
  const retainBytes = Math.min(
    sanitizeAllowedNumber(
      record["retainBytes"],
      LOG_RETAIN_BYTES_OPTIONS,
      DEFAULT_DESKTOP_LOG_SETTINGS.retainBytes,
    ),
    truncateAtBytes,
  );

  return {
    enabled: typeof record["enabled"] === "boolean" ? record["enabled"] : DEFAULT_DESKTOP_LOG_SETTINGS.enabled,
    truncateAtBytes,
    retainBytes,
  };
}

function sanitizeAllowedNumber<T extends readonly number[]>(value: unknown, allowed: T, fallback: T[number]) {
  return typeof value === "number" && allowed.includes(value) ? value : fallback;
}

function saveDesktopLogSettings(settings: DesktopLogSettings) {
  try {
    mkdirSync(devDataRoot, { recursive: true });
    writeFileSync(desktopSettingsPath, JSON.stringify(settings, null, 2), "utf8");
  } catch (error) {
    originalConsole.error("[desktop:log] failed to save desktop log settings", error);
  }
}

function updateDesktopLogSettings(message: DesktopLogSettingsHostMessage) {
  const nextSettings = sanitizeDesktopLogSettings(message);
  const wasEnabled = desktopLogSettings.enabled;
  desktopLogSettings = nextSettings;
  saveDesktopLogSettings(nextSettings);

  if (nextSettings.enabled && !wasEnabled) {
    appendDesktopLogLine("[desktop] log capture enabled from dashboard settings");
  } else if (nextSettings.enabled) {
    appendDesktopLogLine("[desktop] log settings updated from dashboard");
  }
}

function isBatteryFullHostMessage(
  message: BatteryFullHostMessage | DesktopLogSettingsHostMessage,
): message is BatteryFullHostMessage & { title: string; type: "battery-full" } {
  return message.type === "battery-full" && "title" in message && typeof message.title === "string";
}

async function runCommand(command: string[], cwd: string, label: string, extraEnv?: Record<string, string>) {
  const process = Bun.spawn(command, {
    cwd,
    env: { ...Bun.env, ...extraEnv },
    stdout: "pipe",
    stderr: "pipe",
  });

  void streamProcessOutput(process.stdout, `${label}:stdout`);
  void streamProcessOutput(process.stderr, `${label}:stderr`);

  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error(`"${command.join(" ")}" exited with code ${exitCode}.`);
  }
}

function spawnManagedProcess(command: string[], cwd: string, label: string, extraEnv?: Record<string, string>) {
  const process = Bun.spawn(command, {
    cwd,
    env: { ...Bun.env, ...extraEnv },
    stdout: "pipe",
    stderr: "pipe",
  });

  void streamProcessOutput(process.stdout, `${label}:stdout`);
  void streamProcessOutput(process.stderr, `${label}:stderr`);
  void process.exited.then((exitCode) => {
    console.log(`[desktop:${label}] exited with code ${exitCode}`);
  });

  return process;
}

async function isUrlReady(url: string, expectedText?: string) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) {
      return false;
    }

    if (expectedText === undefined) {
      return true;
    }

    const body = await response.text();
    return body.includes(expectedText);
  } catch {
    return false;
  }
}

async function waitForUrl(url: string, label: string, expectedText?: string) {
  const deadline = Date.now() + STACK_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await isUrlReady(url, expectedText)) {
      return;
    }

    await Bun.sleep(STACK_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for the ${label} at ${url}.`);
}

async function ensureDockerStack() {
  await runCommand(PROD_STACK_COMMAND, appRoot, "docker");
}

async function ensureDevBroker() {
  await runCommand(DEV_STOP_CONTAINERS_COMMAND, appRoot, "docker:stop-dev-containers");
  await runCommand(DEV_BROKER_COMMAND, appRoot, "docker:mosquitto");
}

async function resolvePythonCommand(): Promise<string[]> {
  const candidates: string[][] = process.platform === "win32"
    ? [["python"], ["py", "-3"], ["python3"]]
    : [["python3"], ["python"]];

  for (const candidate of candidates) {
    const process = Bun.spawn([...candidate, "--version"], {
      cwd: apiRoot,
      stdout: "ignore",
      stderr: "ignore",
    });

    if (await process.exited === 0) {
      return candidate;
    }
  }

  throw new Error("Could not find a Python runtime. Install Python 3.12+ to run the API in dev mode.");
}

async function ensureApiVenv() {
  mkdirSync(devDataRoot, { recursive: true });

  const requirementsText = await Bun.file(apiRequirementsPath).text();
  const stampText = existsSync(apiRequirementsStampPath)
    ? await Bun.file(apiRequirementsStampPath).text()
    : null;

  if (existsSync(apiVenvPythonPath) && stampText === requirementsText) {
    return;
  }

  const pythonCommand = await resolvePythonCommand();

  if (!existsSync(apiVenvPythonPath)) {
    await runCommand([...pythonCommand, "-m", "venv", ".venv"], apiRoot, "api:venv");
  }

  await runCommand(
    [apiVenvPythonPath, "-m", "pip", "install", "--disable-pip-version-check", "-r", "requirements.txt"],
    apiRoot,
    "api:pip",
  );
  await Bun.write(apiRequirementsStampPath, requirementsText);
}

async function ensureApiServer() {
  if (await isUrlReady(`${API_URL}/devices`)) {
    return;
  }

  await ensureApiVenv();
  apiProcess = spawnManagedProcess(
    [apiVenvPythonPath, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
    apiRoot,
    "api",
    {
      MQTT_HOST: "127.0.0.1",
      MQTT_PORT: "1883",
      DB_PATH: devDatabasePath,
    },
  );
  await waitForUrl(`${API_URL}/devices`, "API");
}

async function ensureDashboardServer() {
  if (await isUrlReady(LOCAL_DASHBOARD_URL, DASHBOARD_READY_MARKER)) {
    return;
  }

  dashboardProcess = spawnManagedProcess(
    [NPM_COMMAND, "run", "dev", "--", "--host", "127.0.0.1", "--port", String(LOCAL_DASHBOARD_PORT)],
    dashboardRoot,
    "dashboard",
    {
      VITE_API_URL: `${API_URL}`,
      VITE_WS_URL: "ws://127.0.0.1:8000/ws",
    },
  );
  await waitForUrl(LOCAL_DASHBOARD_URL, "dashboard", DASHBOARD_READY_MARKER);
}

async function ensureDevStack() {
  await ensureDevBroker();
  await ensureApiServer();
  await ensureDashboardServer();
}

async function ensureBluettiMqttService() {
  const device = await discoverBluettiDevice();
  console.log(`[bluetooth] Starting bluetti-mqtt-node for ${device.mac}...`);
  bluettiMqttService = await launchBluettiMqttService(device, "localhost");
  console.log("[bluetooth] bluetti-mqtt-node started successfully");
}

function showErrorState(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Bluetti Monitor</title>
        <style>
          :root {
            color-scheme: dark;
            font-family: "Segoe UI", sans-serif;
          }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at top, rgba(53, 145, 255, 0.22), transparent 45%),
              linear-gradient(180deg, #07121f 0%, #081827 45%, #04080d 100%);
            color: #eef5ff;
          }
          main {
            width: min(720px, calc(100vw - 48px));
            border: 1px solid rgba(140, 188, 255, 0.25);
            border-radius: 24px;
            padding: 32px;
            background: rgba(7, 18, 31, 0.84);
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
          }
          h1 {
            margin-top: 0;
            font-size: 2rem;
          }
          p {
            line-height: 1.6;
          }
          code {
            display: block;
            margin-top: 20px;
            padding: 14px 16px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.06);
            color: #b8d8ff;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Bluetti Monitor couldn't finish launching</h1>
          <p>
            ${isLocalDev
              ? "The optional desktop shell started, but the local dev stack did not become ready."
              : "The optional desktop shell started, but the packaged dashboard stack did not become ready."}
          </p>
          <code>${message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</code>
        </main>
      </body>
    </html>
  `;

  mainWindow.webview.loadHTML(html);
}

async function bootstrap() {
  const dashboardUrl = isLocalDev ? LOCAL_DASHBOARD_URL : PROD_DASHBOARD_URL;

  try {
    if (isLocalDev) {
      await ensureDevStack();
    } else {
      await ensureDockerStack();
      await waitForUrl(PROD_DASHBOARD_URL, "dashboard", DASHBOARD_READY_MARKER);
    }

    connectTitlebarTelemetry();
    mainWindow.webview.loadURL(dashboardUrl);
    scheduleWebviewNudges();

    void ensureBluettiMqttService().catch((error) => {
      console.error("[bluetooth] failed to start bluetti-mqtt-node", error);
    });
  } catch (error) {
    console.error("[desktop] failed to start stack", error);
    showErrorState(error);
  }
}

function stopManagedProcess(process: Bun.Subprocess | null, label: string) {
  if (process === null || process.killed) {
    return;
  }

  console.log(`[desktop:${label}] stopping`);
  process.kill();
}

function stopBackgroundProcesses() {
  isShuttingDown = true;
  titlebarSocket?.close();
  titlebarSocket = null;

  bluettiMqttService?.stop();
  bluettiMqttService = null;

  stopManagedProcess(apiProcess, "api");
  stopManagedProcess(dashboardProcess, "dashboard");
  apiProcess = null;
  dashboardProcess = null;
}

process.on("beforeExit", stopBackgroundProcesses);
process.on("SIGINT", stopBackgroundProcesses);
process.on("SIGTERM", stopBackgroundProcesses);

void bootstrap();

function connectTitlebarTelemetry() {
  titlebarSocket?.close();

  const socket = new WebSocket(getApiWebSocketUrl(API_URL));
  titlebarSocket = socket;

  socket.addEventListener("message", (event) => {
    const payload = parseSocketPayload(event.data);

    if (isSnapshotMessage(payload)) {
      titlebarState = payload.data;
      refreshWindowTitle();
      return;
    }

    if (isUpdateMessage(payload)) {
      const deviceState = titlebarState[payload.device] ?? {};
      deviceState[payload.field] = { value: payload.value, ts: payload.ts };
      titlebarState[payload.device] = deviceState;
      refreshWindowTitle();
    }
  });

  socket.addEventListener("error", (event) => {
    console.warn("[desktop:titlebar] telemetry websocket error", event);
  });

  socket.addEventListener("close", () => {
    if (titlebarSocket !== socket) {
      return;
    }

    titlebarSocket = null;

    if (isShuttingDown) {
      return;
    }

    setTimeout(() => {
      if (!isShuttingDown) {
        connectTitlebarTelemetry();
      }
    }, TITLEBAR_RECONNECT_DELAY_MS);
  });
}

function refreshWindowTitle() {
  mainWindow.setTitle(buildWindowTitle(titlebarState));
}

function getApiWebSocketUrl(apiUrl: string) {
  const url = new URL(apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function parseSocketPayload(payload: unknown): unknown {
  if (typeof payload !== "string") {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch (error) {
    console.warn("[desktop:titlebar] failed to parse telemetry websocket payload", error);
    return null;
  }
}

function isAllState(value: unknown): value is AllState {
  return typeof value === "object" && value !== null;
}

function isSnapshotMessage(value: unknown): value is TitlebarSnapshotMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record["type"] === "snapshot" && isAllState(record["data"]);
}

function isUpdateMessage(value: unknown): value is TitlebarUpdateMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record["device"] === "string"
    && typeof record["field"] === "string"
    && typeof record["value"] === "string"
    && typeof record["ts"] === "string"
  );
}

function findWorkspaceRoot(): string {
  const starts = [process.cwd(), import.meta.dir];

  for (const start of starts) {
    let current = resolve(start);

    while (true) {
      if (
        existsSync(resolve(current, "dashboard", "package.json"))
        && existsSync(resolve(current, "api", "main.py"))
        && existsSync(resolve(current, "docker-compose.yml"))
      ) {
        return current;
      }

      const parent = dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  return process.cwd();
}
