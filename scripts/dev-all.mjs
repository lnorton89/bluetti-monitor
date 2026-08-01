import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDevSessionLogger, pipeProcessOutput } from "./dev-session.mjs";
import { getLocalBinScriptPath } from "./monitor/shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(__dirname, "..");
const analyticsRoot = resolve(workspaceRoot, "analytics");
const viteScript = getLocalBinScriptPath(analyticsRoot, "vite");
const localDashboardUrl = "http://127.0.0.1:5400";
const sessionLogPath = resolve(workspaceRoot, ".dev-data", "logs", "dev-all.log");
const logger = createDevSessionLogger({ logPath: sessionLogPath });
const children = new Set();
let shuttingDown = false;

process.once("SIGINT", () => {
  logger.event("supervisor", "received signal", { signal: "SIGINT" });
  shutdownChildren();
  process.exit(0);
});

process.once("SIGTERM", () => {
  logger.event("supervisor", "received signal", { signal: "SIGTERM" });
  shutdownChildren();
  process.exit(0);
});

logger.event("supervisor", "session starting", {
  logPath: sessionLogPath,
  pid: process.pid,
});

const monitor = spawnManaged("monitor", process.execPath, [resolve(workspaceRoot, "scripts", "monitor", "dev.mjs")]);
const analytics = spawnManaged("analytics", process.execPath, [viteScript, "--host", "0.0.0.0", "--port", "5300"], {
  cwd: analyticsRoot,
});
const desktop = spawnManaged(
  "desktop",
  process.execPath,
  [resolve(workspaceRoot, "scripts", "dev-desktop.mjs"), "--watch-electrobun"],
  {
    env: { BLUETTI_DASHBOARD_URL: process.env.BLUETTI_DASHBOARD_URL || localDashboardUrl },
  },
);

const exitCode = await Promise.race([monitor.exitCode, analytics.exitCode, desktop.exitCode]);
logger.event("supervisor", "essential child exited", { exitCode });
shutdownChildren();
process.exit(typeof exitCode === "number" ? exitCode : 0);

function spawnManaged(label, command, args, { cwd = workspaceRoot, env = {}, shell = false } = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["inherit", "pipe", "pipe"],
    shell,
    windowsHide: true,
  });

  logger.event(label, "spawned", {
    pid: child.pid,
    command,
    args,
  });
  pipeProcessOutput(child.stdout, { component: label, streamName: "stdout", logger });
  pipeProcessOutput(child.stderr, { component: label, streamName: "stderr", logger });

  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    logger.event(label, "exited", { code, signal });
  });
  child.once("error", (error) => {
    logger.event(label, "failed to start", {
      name: error.name,
      message: error.message,
    });
  });

  return {
    exitCode: new Promise((resolvePromise) => {
      let settled = false;
      child.once("exit", (code) => {
        if (settled) return;
        settled = true;
        resolvePromise(code ?? 0);
      });
      child.once("error", () => {
        if (settled) return;
        settled = true;
        resolvePromise(1);
      });
    }),
  };
}

function shutdownChildren() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.event("supervisor", "stopping children", { childCount: children.size });

  for (const child of children) {
    if (child.exitCode !== null || child.killed) {
      continue;
    }

    if (process.platform === "win32" && child.pid) {
      logger.event("supervisor", "terminating Windows child tree", { pid: child.pid });
      spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      continue;
    }

    child.kill("SIGTERM");
  }
}
