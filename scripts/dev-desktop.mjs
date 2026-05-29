import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, watch, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(__dirname, "..");
const devLogPath = resolve(workspaceRoot, ".dev-data", "logs", "desktop-dev.log");
const devLogMaxBytes = 2 * 1024 * 1024;
const devLogRetainBytes = 512 * 1024;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const electrobunCommand = resolveElectrobunCommand();
const shouldWatchElectrobun = process.argv.includes("--watch-electrobun");
let shuttingDown = false;
const childProcesses = new Set();

try {
  logDevEvent("[desktop:dev] workflow starting", {
    electrobunCommand,
    watchElectrobun: shouldWatchElectrobun,
  });

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

  const desktopProcess = shouldWatchElectrobun
    ? spawnRestartingDesktop(
        electrobunCommand,
        ["dev"],
        "[desktop:app]",
      )
    : spawnManaged(
        electrobunCommand,
        ["dev"],
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
    stdio: ["inherit", "pipe", "pipe"],
    shell: shouldUseShell(command),
  });

  logDevEvent(`${label} spawned`, {
    pid: child.pid,
    command,
    args,
  });
  pipeChildOutput(child.stdout, label, "stdout");
  pipeChildOutput(child.stderr, label, "stderr");

  childProcesses.add(child);
  child.once("exit", (code, signal) => {
    childProcesses.delete(child);
    logDevEvent(`${label} exited`, { code, signal });
    if (!shuttingDown) {
      writeConsoleLine(`${label} exited`);
    }
  });
  child.once("error", (error) => {
    logDevEvent(`${label} failed to start`, { error: formatError(error) });
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

function spawnRestartingDesktop(command, args, label) {
  const rawTargets = [
    { path: resolve(workspaceRoot, "src", "bun") },
    { path: resolve(workspaceRoot, "src", "mainview") },
    { path: resolve(workspaceRoot, "assets", "icons", "icon.ico") },
    { path: resolve(workspaceRoot, "assets", "icons", "icon.png") },
    { path: resolve(workspaceRoot, "electrobun.config.ts") },
  ];

  const watchTargets = rawTargets
    .filter((entry) => existsSync(entry.path))
    .map((entry) => ({
      path: entry.path,
      isDir: statSync(entry.path).isDirectory(),
    }));

  const watchers = watchTargets.map(({ path: target, isDir }) => watch(target, { recursive: isDir }, (_event, filename) => {
    if (shuttingDown) {
      return;
    }

    const changedPath = filename && isDir
      ? resolve(target, String(filename))
      : target;

    scheduleDesktopRestart(changedPath);
  }));

  let currentChild = null;
  let restartTimer = null;
  let restarting = false;
  let resolveExitCode;
  const exitCode = new Promise((resolvePromise) => {
    resolveExitCode = resolvePromise;
  });

  logDevEvent(`${label} precise watcher starting`, { watchTargets });
  startDesktopChild();

  return {
    process: null,
    exitCode,
  };

  function startDesktopChild() {
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      stdio: ["inherit", "pipe", "pipe"],
      shell: shouldUseShell(command),
    });

    currentChild = child;
    childProcesses.add(child);
    logDevEvent(`${label} spawned`, {
      pid: child.pid,
      command,
      args,
      managedBy: "precise-watch",
    });
    pipeChildOutput(child.stdout, label, "stdout");
    pipeChildOutput(child.stderr, label, "stderr");

    child.once("exit", (code, signal) => {
      childProcesses.delete(child);
      logDevEvent(`${label} exited`, { code, signal, restarting });
      if (currentChild === child) {
        currentChild = null;
      }

      if (restarting && !shuttingDown) {
        restarting = false;
        startDesktopChild();
        return;
      }

      closeDesktopWatchers();
      if (!shuttingDown) {
        writeConsoleLine(`${label} exited`);
      }
      resolveExitCode(code ?? 0);
    });

    child.once("error", (error) => {
      logDevEvent(`${label} failed to start`, { error: formatError(error) });
      closeDesktopWatchers();
      resolveExitCode(1);
    });
  }

  function scheduleDesktopRestart(changedPath) {
    if (restartTimer) {
      clearTimeout(restartTimer);
    }

    restartTimer = setTimeout(() => {
      restartTimer = null;
      restartDesktop(changedPath);
    }, 300);
  }

  function restartDesktop(changedPath) {
    logDevEvent(`${label} precise watcher restart`, { changedPath });
    writeConsoleLine(`[desktop:app] source changed: ${changedPath}`);
    writeConsoleLine("[desktop:app] rebuilding desktop shell...");

    if (!currentChild || currentChild.exitCode !== null || currentChild.killed) {
      startDesktopChild();
      return;
    }

    restarting = true;
    terminateChildTree(currentChild);
  }

  function closeDesktopWatchers() {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }

    for (const watcher of watchers) {
      try {
        watcher.close();
      } catch {
        // Best effort cleanup.
      }
    }
  }
}

function runCommand(command, args, label) {
  return new Promise((resolvePromise, rejectPromise) => {
    writeConsoleLine(`${label} starting...`);
    logDevEvent(`${label} starting`, { command, args });
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      stdio: ["inherit", "pipe", "pipe"],
      shell: shouldUseShell(command),
    });

    pipeChildOutput(child.stdout, label, "stdout");
    pipeChildOutput(child.stderr, label, "stderr");
    child.once("error", (error) => {
      logDevEvent(`${label} failed to start`, { error: formatError(error) });
      rejectPromise(error);
    });
    child.once("exit", (code, signal) => {
      logDevEvent(`${label} exited`, { code, signal });
      if (code === 0) {
        writeConsoleLine(`${label} complete`);
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
  logDevEvent("[desktop:dev] shutting down child processes", {
    childCount: childProcesses.size,
  });
  for (const child of childProcesses) {
    terminateChildTree(child);
  }
}

function terminateChildTree(child) {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  if (process.platform === "win32") {
    logDevEvent("[desktop:dev] terminating child tree", { pid: child.pid });
    spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill("SIGTERM");
}

function pipeChildOutput(stream, label, streamName) {
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
      writeChildLine(label, streamName, line);
    }
  });

  stream.on("end", () => {
    if (pending.length > 0) {
      writeChildLine(label, streamName, pending);
      pending = "";
    }
  });
}

function writeChildLine(label, streamName, rawLine) {
  const line = stripAnsi(rawLine);
  writeConsoleLine(line);

  if (line.trim().length === 0) {
    return;
  }

  logDevEvent(`${label} ${streamName}`, { line });
}

function writeConsoleLine(line) {
  console.log(line);
}

function logDevEvent(message, context = {}) {
  try {
    rotateDevLogIfNeeded();
    mkdirSync(dirname(devLogPath), { recursive: true });
    appendFileSync(
      devLogPath,
      `${new Date().toISOString()} ${JSON.stringify({ message, ...context })}\n`,
      "utf8",
    );
  } catch {
    // Logging must never break the dev workflow.
  }
}

function rotateDevLogIfNeeded() {
  if (!existsSync(devLogPath)) {
    return;
  }

  const { size } = statSync(devLogPath);
  if (size <= devLogMaxBytes) {
    return;
  }

  const bytes = readFileSync(devLogPath);
  const retained = bytes.subarray(Math.max(0, bytes.length - devLogRetainBytes));
  writeFileSync(devLogPath, retained);

  appendFileSync(
    devLogPath,
    `${new Date().toISOString()} ${JSON.stringify({ message: "[desktop:dev] log rotated" })}\n`,
    "utf8",
  );
}

function stripAnsi(value) {
  return value.replace(/\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g, "");
}

function formatError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return String(error);
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
