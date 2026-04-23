import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const electrobunCommand = resolveElectrobunCommand();
const shouldWatchElectrobun = process.argv.includes("--watch-electrobun");
let shuttingDown = false;
const childProcesses = new Set();

try {
  await runCommand(
    npmCommand,
    ["--prefix", "lib/bluetti-mqtt-node", "run", "build"],
    "[desktop:lib] initial build",
  );

  const libraryWatcher = spawnManaged(
    npmCommand,
    ["--prefix", "lib/bluetti-mqtt-node", "run", "build", "--", "--watch"],
    "[desktop:lib] watch",
  );

  const electrobunArgs = shouldWatchElectrobun ? ["dev", "--watch"] : ["dev"];
  const desktopProcess = spawnManaged(
    electrobunCommand,
    electrobunArgs,
    "[desktop:app]",
  );

  const exitCode = await Promise.race([
    libraryWatcher.exitCode,
    desktopProcess.exitCode,
  ]);

  shutdownChildren();
  process.exit(typeof exitCode === "number" ? exitCode : 0);
} catch (error) {
  shutdownChildren();
  console.error("[desktop:dev] failed to start desktop development workflow", error);
  process.exit(1);
}

process.on("SIGINT", () => {
  shutdownChildren();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdownChildren();
  process.exit(0);
});

function spawnManaged(command, args, label) {
  const child = spawn(command, args, {
    cwd: workspaceRoot,
    stdio: "inherit",
    shell: shouldUseShell(command),
  });

  childProcesses.add(child);
  child.once("exit", () => {
    childProcesses.delete(child);
    if (!shuttingDown) {
      console.log(`${label} exited`);
    }
  });
  child.once("error", (error) => {
    console.error(`${label} failed to start`, error);
  });

  return {
    process: child,
    exitCode: new Promise((resolvePromise) => {
      child.once("exit", (code) => {
        resolvePromise(code ?? 0);
      });
    }),
  };
}

function runCommand(command, args, label) {
  return new Promise((resolvePromise, rejectPromise) => {
    console.log(`${label} starting...`);
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      stdio: "inherit",
      shell: shouldUseShell(command),
    });

    child.once("error", rejectPromise);
    child.once("exit", (code) => {
      if (code === 0) {
        console.log(`${label} complete`);
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${label} exited with code ${code ?? -1}`));
    });
  });
}

function shutdownChildren() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of childProcesses) {
    terminateChildTree(child);
  }
}

function terminateChildTree(child) {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill("SIGTERM");
}

function shouldUseShell(command) {
  if (process.platform !== "win32") {
    return false;
  }

  return command.endsWith(".cmd") || command.endsWith(".bat");
}

function resolveElectrobunCommand() {
  const candidates = process.platform === "win32"
    ? [
        resolve(workspaceRoot, "node_modules", ".bin", "electrobun.exe"),
        resolve(workspaceRoot, "node_modules", ".bin", "electrobun.cmd"),
      ]
    : [
        resolve(workspaceRoot, "node_modules", ".bin", "electrobun"),
      ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return process.platform === "win32" ? "electrobun.exe" : "electrobun";
}
