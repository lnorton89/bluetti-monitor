import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { BrowserWindow } from "electrobun/bun";
import {
  discoverAC500,
  startBluettiMqttService as launchBluettiMqttService,
  type BluettiMqttService,
} from "./bluetooth";

const API_URL = "http://127.0.0.1:8000";
const DASHBOARD_PORT = 5173;
const DASHBOARD_URL = `http://127.0.0.1:${DASHBOARD_PORT}`;
const STACK_READY_TIMEOUT_MS = 90_000;
const STACK_POLL_INTERVAL_MS = 1_500;
const PROD_STACK_COMMAND = ["docker", "compose", "up", "-d"];
const DEV_BROKER_COMMAND = ["docker", "compose", "up", "-d", "mosquitto"];
const DEV_STOP_CONTAINERS_COMMAND = ["docker", "compose", "stop", "api", "dashboard"];
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const DASHBOARD_READY_MARKER = '<div id="root"></div>';

const appRoot = findWorkspaceRoot();
const apiRoot = resolve(appRoot, "api");
const dashboardRoot = resolve(appRoot, "dashboard");
const devDataRoot = resolve(appRoot, ".dev-data");
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
  if (await isUrlReady(DASHBOARD_URL, DASHBOARD_READY_MARKER)) {
    return;
  }

  dashboardProcess = spawnManagedProcess(
    [NPM_COMMAND, "run", "dev", "--", "--host", "127.0.0.1", "--port", String(DASHBOARD_PORT)],
    dashboardRoot,
    "dashboard",
    {
      VITE_API_URL: `${API_URL}`,
      VITE_WS_URL: "ws://127.0.0.1:8000/ws",
    },
  );
  await waitForUrl(DASHBOARD_URL, "dashboard", DASHBOARD_READY_MARKER);
}

async function ensureDevStack() {
  await ensureDevBroker();
  await ensureApiServer();
  await ensureDashboardServer();
}

async function ensureBluettiMqttService() {
  const device = await discoverAC500();
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
              ? "The desktop shell started, but the local dev stack did not become ready."
              : "The desktop shell started, but the local Docker stack did not become ready."}
          </p>
          <code>${message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</code>
        </main>
      </body>
    </html>
  `;

  mainWindow.webview.loadHTML(html);
}

async function bootstrap() {
  try {
    if (isLocalDev) {
      await ensureDevStack();
    } else {
      await ensureDockerStack();
      await waitForUrl(DASHBOARD_URL, "dashboard");
    }

    mainWindow.webview.loadURL(DASHBOARD_URL);
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
