import { BrowserWindow } from "electrobun/bun";
import {
  discoverAC500,
  startBluettiMqttService as launchBluettiMqttService,
  type BluettiMqttService,
} from "./bluetooth";

const DASHBOARD_URL = "http://localhost:8540";
const STACK_READY_TIMEOUT_MS = 90_000;
const STACK_POLL_INTERVAL_MS = 1_500;
const STACK_COMMAND = ["docker", "compose", "up", "-d"];

const appRoot = import.meta.dir.replace(/src[\\/]bun$/, "");

let bluettiMqttService: BluettiMqttService | null = null;

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

async function ensureDockerStack() {
  const process = Bun.spawn(STACK_COMMAND, {
    cwd: appRoot,
    stdout: "pipe",
    stderr: "pipe",
  });

  void streamProcessOutput(process.stdout, "stdout");
  void streamProcessOutput(process.stderr, "stderr");

  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error(`"${STACK_COMMAND.join(" ")}" exited with code ${exitCode}.`);
  }
}

async function waitForDashboard() {
  const deadline = Date.now() + STACK_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(DASHBOARD_URL, {
        signal: AbortSignal.timeout(2_500),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the container is ready or we time out.
    }

    await Bun.sleep(STACK_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for the dashboard at ${DASHBOARD_URL}.`);
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
            The desktop shell started, but the local Docker stack did not become ready.
            Check that Docker Desktop is running, then start the containers manually with
            <strong>docker compose up -d</strong> from the project root.
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
    await ensureDockerStack();
    await waitForDashboard();

    mainWindow.webview.loadURL(DASHBOARD_URL);

    void ensureBluettiMqttService().catch((error) => {
      console.error("[bluetooth] failed to start bluetti-mqtt-node", error);
    });
  } catch (error) {
    console.error("[desktop] failed to start stack", error);
    showErrorState(error);
  }
}

function stopBackgroundProcesses() {
  bluettiMqttService?.stop();
  bluettiMqttService = null;
}

process.on("beforeExit", stopBackgroundProcesses);
process.on("SIGINT", stopBackgroundProcesses);
process.on("SIGTERM", stopBackgroundProcesses);

void bootstrap();
