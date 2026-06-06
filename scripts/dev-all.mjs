import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const localDashboardUrl = "http://127.0.0.1:5173";
const children = new Set();
let shuttingDown = false;

process.once("SIGINT", () => {
  shutdownChildren();
  process.exit(0);
});

process.once("SIGTERM", () => {
  shutdownChildren();
  process.exit(0);
});

const monitor = spawnManaged("monitor:dev");
const analytics = spawnManaged("analytics:dev");
const desktop = spawnManaged("desktop:dev", {
  BLUETTI_DASHBOARD_URL: process.env.BLUETTI_DASHBOARD_URL || localDashboardUrl,
});

const exitCode = await Promise.race([monitor.exitCode, analytics.exitCode, desktop.exitCode]);
shutdownChildren();
process.exit(typeof exitCode === "number" ? exitCode : 0);

function spawnManaged(scriptName, env = {}) {
  const child = spawn(npmCommand, ["run", scriptName], {
    cwd: workspaceRoot,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  children.add(child);
  child.once("exit", () => {
    children.delete(child);
  });
  child.once("error", (error) => {
    console.error(`[dev:all] Failed to start ${scriptName}:`, error);
  });

  return {
    exitCode: new Promise((resolvePromise) => {
      child.once("exit", (code) => {
        resolvePromise(code ?? 0);
      });
    }),
  };
}

function shutdownChildren() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (child.exitCode !== null || child.killed) {
      continue;
    }

    if (process.platform === "win32" && child.pid) {
      spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      continue;
    }

    child.kill("SIGTERM");
  }
}
