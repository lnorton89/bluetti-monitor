import { existsSync, readdirSync, statSync, watch } from "node:fs";
import { relative, resolve } from "node:path";
import {
  BROKER_URL,
  getNpmCommand,
  getWorkspaceRoot,
  resolveDeviceAddress,
  runAttachedCommand,
  runCommand,
  spawnAttachedCommand,
  stopProcess,
} from "./shared.mjs";

const DEFAULT_RETRY_DELAY_MS = 5_000;
const DEFAULT_REBUILD_DEBOUNCE_MS = 750;

export function createBridgeDevSupervisor({
  workspaceRoot = getWorkspaceRoot(),
  brokerUrl = BROKER_URL,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  rebuildDebounceMs = DEFAULT_REBUILD_DEBOUNCE_MS,
  logger = console,
  resolveDeviceAddressFn,
  spawnAttachedCommandFn = spawnAttachedCommand,
  stopProcessFn = stopProcess,
  preflightFn,
  watchFactory = watch,
  watchSubmodule = true,
} = {}) {
  const paths = getBridgeWorkspacePaths(workspaceRoot);
  const resolveAddress = resolveDeviceAddressFn ?? (() => resolveDeviceAddress({
    discoveryCommand: process.execPath,
    discoveryArgs: [paths.discoveryCliPath],
  }));
  const ensureReady = preflightFn ?? ((buildRequest) => ensureBridgeWorkspaceReady({
    workspaceRoot,
    paths,
    buildRequest,
    logger,
  }));

  let stopping = false;
  let attemptRunning = false;
  let preflightComplete = false;
  let bridgeProcess = null;
  let retryTimer = null;
  let rebuildTimer = null;
  let knownDevice = null;
  let pendingReason = "startup";
  let pendingBuildRequest = { javascript: false, helper: false };
  const watchers = [];

  return {
    async start() {
      if (stopping) return;
      logger.info("[monitor:bridge] Starting real AC500 bridge supervisor.");
      if (watchSubmodule) {
        watchers.push(...createBridgeWatchers(paths, onSourceChange, watchFactory, logger));
      }
      scheduleAttempt(0, "startup");
    },
    async stop() {
      if (stopping) return;
      stopping = true;
      clearScheduledWork();
      for (const watcher of watchers) {
        try {
          watcher.close();
        } catch {
          // Best effort watcher cleanup.
        }
      }
      watchers.length = 0;
      await stopBridge("supervisor shutdown");
    },
    getState() {
      return {
        stopping,
        attemptRunning,
        bridgePid: bridgeProcess?.pid ?? null,
        knownDeviceMac: knownDevice?.mac ?? null,
        retryScheduled: retryTimer !== null,
        rebuildScheduled: rebuildTimer !== null,
      };
    },
  };

  function onSourceChange(changeKind, changedPath) {
    if (stopping) return;
    if (!bridgeArtifactIsStaleForChange(paths, changeKind)) return;

    pendingBuildRequest[changeKind] = true;
    pendingReason = `submodule ${changeKind} change: ${relative(paths.bridgeRoot, changedPath)}`;

    if (rebuildTimer) {
      clearTimeout(rebuildTimer);
    }
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      scheduleAttempt(0, pendingReason);
    }, rebuildDebounceMs);
  }

  function scheduleAttempt(delayMs, reason) {
    if (stopping) return;
    pendingReason = reason;

    if (retryTimer) {
      clearTimeout(retryTimer);
    }
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void runAttempt();
    }, delayMs);
  }

  async function runAttempt() {
    if (stopping) return;
    if (attemptRunning) {
      scheduleAttempt(retryDelayMs, pendingReason);
      return;
    }

    attemptRunning = true;
    const reason = pendingReason;
    const buildRequest = pendingBuildRequest;
    pendingBuildRequest = { javascript: false, helper: false };

    try {
      if (buildRequest.javascript || buildRequest.helper) {
        await stopBridge("submodule rebuild");
      }

      if (!preflightComplete || buildRequest.javascript || buildRequest.helper) {
        preflightComplete = false;
        await ensureReady(buildRequest);
        preflightComplete = true;
      }
      if (stopping) return;

      const device = knownDevice
        ? { ...knownDevice, source: "session cache" }
        : await resolveAddress();
      knownDevice ??= device;
      if (stopping) return;

      if (bridgeProcess && bridgeProcess.exitCode === null && !bridgeProcess.killed) {
        return;
      }

      logger.info(`[monitor:bridge] Connecting real device ${device.mac} (${device.source}; ${reason}).`);
      const child = spawnAttachedCommandFn(
        process.execPath,
        [paths.bridgeCliPath, "--broker", brokerUrl, device.mac],
        {
          env: { ...process.env },
          label: "monitor:bridge",
        },
      );
      bridgeProcess = child;

      child.once("close", (exitCode) => {
        if (bridgeProcess !== child) return;
        bridgeProcess = null;
        if (stopping) return;

        logger.warn(
          `[monitor:bridge] Bridge exited with code ${exitCode}; real-device reconnect scheduled in ${retryDelayMs}ms.`,
        );
        scheduleAttempt(retryDelayMs, "bridge process exit");
      });
    } catch (error) {
      if (!stopping) {
        logger.warn(`[monitor:bridge] Real AC500 unavailable: ${formatError(error)}`);
        logger.warn(`[monitor:bridge] Stack remains online; retrying in ${retryDelayMs}ms.`);
        scheduleAttempt(retryDelayMs, "preflight or discovery retry");
      }
    } finally {
      attemptRunning = false;
      if (!stopping && (pendingBuildRequest.javascript || pendingBuildRequest.helper) && !rebuildTimer) {
        scheduleAttempt(rebuildDebounceMs, pendingReason);
      }
    }
  }

  async function stopBridge(reason) {
    if (!bridgeProcess) return;
    const child = bridgeProcess;
    bridgeProcess = null;
    logger.info(`[monitor:bridge] Stopping bridge for ${reason}.`);
    await stopProcessFn(child, "bridge");
  }

  function clearScheduledWork() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (rebuildTimer) {
      clearTimeout(rebuildTimer);
      rebuildTimer = null;
    }
  }
}

export function getBridgeWorkspacePaths(workspaceRoot) {
  const bridgeRoot = resolve(workspaceRoot, "lib", "bluetti-mqtt-node");
  return {
    bridgeRoot,
    packagePath: resolve(bridgeRoot, "package.json"),
    tsconfigPath: resolve(bridgeRoot, "tsconfig.json"),
    sourceRoot: resolve(bridgeRoot, "src"),
    helperSourceRoot: resolve(bridgeRoot, "helper", "BluettiMqtt.BluetoothHelper"),
    bridgeCliPath: resolve(bridgeRoot, "dist", "cli", "bluetti-mqtt.js"),
    discoveryCliPath: resolve(bridgeRoot, "dist", "cli", "bluetti-discovery.js"),
    helperArtifactPath: resolve(
      bridgeRoot,
      "artifacts",
      "helper",
      "win-x64",
      "BluettiMqtt.BluetoothHelper.exe",
    ),
  };
}

export function inspectBridgeArtifacts(paths) {
  if (!existsSync(paths.packagePath) || !existsSync(paths.sourceRoot)) {
    return {
      initialized: false,
      javascriptStale: true,
      helperStale: true,
    };
  }

  const javascriptInputMtime = newestMtime([
    paths.sourceRoot,
    paths.packagePath,
    paths.tsconfigPath,
  ], isJavaScriptBuildInput);
  const helperInputMtime = newestMtime([paths.helperSourceRoot], isHelperBuildInput);
  const javascriptArtifactMtime = oldestExistingMtime([
    paths.bridgeCliPath,
    paths.discoveryCliPath,
  ]);
  const helperArtifactMtime = fileMtime(paths.helperArtifactPath);

  return {
    initialized: true,
    javascriptStale: javascriptArtifactMtime === null || javascriptInputMtime > javascriptArtifactMtime,
    helperStale: helperArtifactMtime === null || helperInputMtime > helperArtifactMtime,
    javascriptInputMtime,
    javascriptArtifactMtime,
    helperInputMtime,
    helperArtifactMtime,
  };
}

export function bridgeArtifactIsStaleForChange(paths, changeKind) {
  const artifacts = inspectBridgeArtifacts(paths);
  return changeKind === "javascript"
    ? artifacts.javascriptStale
    : artifacts.helperStale;
}

export function classifyBridgeChange(relativePath) {
  const normalized = String(relativePath).replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    normalized === "package.json"
    || normalized === "tsconfig.json"
    || (normalized.startsWith("src/") && /\.(?:ts|json)$/i.test(normalized))
  ) {
    return "javascript";
  }

  const helperPrefix = "helper/BluettiMqtt.BluetoothHelper/";
  if (
    normalized.startsWith(helperPrefix)
    && !/^(?:bin|obj)\//i.test(normalized.slice(helperPrefix.length))
    && /\.(?:cs|csproj|props|targets|json)$/i.test(normalized)
  ) {
    return "helper";
  }

  return null;
}

export async function probeHelperArtifact(helperArtifactPath, runCommandFn = runCommand) {
  try {
    const { stdout } = await runCommandFn(helperArtifactPath, [], { timeout: 5_000 });
    for (const line of stdout.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);
        if (message?.type === "event" && message?.name === "ready") {
          return { healthy: true, reason: "ready" };
        }
      } catch {
        // Ignore non-protocol output and require an explicit ready event.
      }
    }

    return { healthy: false, reason: "helper exited without a ready event" };
  } catch (error) {
    return {
      healthy: false,
      reason: formatError(error).replace(/\s+/g, " ").trim(),
    };
  }
}

async function ensureBridgeWorkspaceReady({ workspaceRoot, paths, buildRequest, logger }) {
  const artifacts = inspectBridgeArtifacts(paths);
  if (!artifacts.initialized) {
    throw new Error("bluetti-mqtt-node submodule is not initialized; run git submodule update --init --recursive");
  }

  await logSubmoduleRevisionState(workspaceRoot, paths.bridgeRoot, logger);

  const buildJavaScript = buildRequest.javascript || artifacts.javascriptStale;
  let buildHelper = buildRequest.helper || artifacts.helperStale;
  const npmCommand = getNpmCommand();

  if (!buildHelper) {
    const helperProbe = await probeHelperArtifact(paths.helperArtifactPath);
    if (!helperProbe.healthy) {
      logger.warn(
        `[monitor:bridge] Windows BLE helper artifact is unhealthy (${helperProbe.reason}); rebuilding it.`,
      );
      buildHelper = true;
    }
  }

  if (buildJavaScript) {
    logger.info("[monitor:bridge] Building stale bluetti-mqtt-node JavaScript artifacts.");
    await runAttachedCommand(npmCommand, ["--prefix", paths.bridgeRoot, "run", "build"], {
      cwd: workspaceRoot,
      label: "monitor:bridge-build",
      windowsHide: true,
    });
  }

  if (buildHelper) {
    logger.info("[monitor:bridge] Publishing stale Windows BLE helper artifact.");
    await runAttachedCommand(npmCommand, ["--prefix", paths.bridgeRoot, "run", "helper:publish"], {
      cwd: workspaceRoot,
      label: "monitor:helper-build",
      windowsHide: true,
    });
  }

  const afterBuild = inspectBridgeArtifacts(paths);
  const helperProbe = await probeHelperArtifact(paths.helperArtifactPath);
  if (afterBuild.javascriptStale || afterBuild.helperStale || !helperProbe.healthy) {
    if (!helperProbe.healthy) {
      throw new Error(`Windows BLE helper artifact failed its ready probe: ${helperProbe.reason}`);
    }
    throw new Error("bluetti-mqtt-node artifacts are still stale after preflight build");
  }
}

async function logSubmoduleRevisionState(workspaceRoot, bridgeRoot, logger) {
  try {
    const [{ stdout: actualOutput }, { stdout: expectedOutput }, { stdout: statusOutput }] = await Promise.all([
      runCommand("git", ["-C", bridgeRoot, "rev-parse", "HEAD"], { cwd: workspaceRoot }),
      runCommand("git", ["ls-tree", "HEAD", "lib/bluetti-mqtt-node"], { cwd: workspaceRoot }),
      runCommand("git", ["-C", bridgeRoot, "status", "--porcelain"], { cwd: workspaceRoot }),
    ]);

    const actual = actualOutput.trim();
    const expected = expectedOutput.trim().match(/\b[0-9a-f]{40}\b/i)?.[0] ?? null;
    if (expected && actual !== expected) {
      logger.warn(
        `[monitor:bridge] Submodule checkout ${actual.slice(0, 7)} differs from parent gitlink ${expected.slice(0, 7)}; using the checked-out revision.`,
      );
    } else {
      logger.info(`[monitor:bridge] Submodule revision ${actual.slice(0, 7)} matches the parent gitlink.`);
    }

    if (statusOutput.trim()) {
      logger.warn("[monitor:bridge] Submodule has uncommitted source changes; dev rebuilds will use them.");
    }
  } catch (error) {
    logger.warn(`[monitor:bridge] Could not inspect submodule revision state: ${formatError(error)}`);
  }
}

function createBridgeWatchers(paths, onChange, watchFactory, logger) {
  const registrations = [
    { root: paths.sourceRoot, recursive: true, prefix: "src" },
    { root: paths.helperSourceRoot, recursive: true, prefix: "helper/BluettiMqtt.BluetoothHelper" },
    { root: paths.bridgeRoot, recursive: false, prefix: "" },
  ];
  const watchers = [];

  for (const registration of registrations) {
    if (!existsSync(registration.root)) continue;
    try {
      const watcher = watchFactory(
        registration.root,
        { recursive: registration.recursive },
        (_event, filename) => {
          if (!filename) return;
          const relativeName = String(filename).replaceAll("\\", "/");
          const relativePath = registration.prefix
            ? `${registration.prefix}/${relativeName}`
            : relativeName;
          const kind = classifyBridgeChange(relativePath);
          if (!kind) return;
          onChange(kind, resolve(registration.root, String(filename)));
        },
      );
      watchers.push(watcher);
    } catch (error) {
      logger.warn(`[monitor:bridge] Could not watch ${registration.root}: ${formatError(error)}`);
    }
  }

  logger.info(`[monitor:bridge] Watching ${watchers.length} submodule input location(s).`);
  return watchers;
}

function newestMtime(paths, predicate) {
  let newest = 0;
  for (const path of paths) {
    newest = Math.max(newest, newestMtimeInPath(path, predicate));
  }
  return newest;
}

function newestMtimeInPath(path, predicate) {
  if (!existsSync(path)) return 0;
  const stats = statSync(path);
  if (stats.isFile()) {
    return predicate(path) ? stats.mtimeMs : 0;
  }

  let newest = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === "bin" || entry.name === "obj" || entry.name === "node_modules") continue;
    newest = Math.max(newest, newestMtimeInPath(resolve(path, entry.name), predicate));
  }
  return newest;
}

function oldestExistingMtime(paths) {
  const mtimes = paths.map(fileMtime);
  if (mtimes.some((mtime) => mtime === null)) return null;
  return Math.min(...mtimes);
}

function fileMtime(path) {
  return existsSync(path) ? statSync(path).mtimeMs : null;
}

function isJavaScriptBuildInput(path) {
  return /(?:package\.json|tsconfig\.json|\.(?:ts|json))$/i.test(path);
}

function isHelperBuildInput(path) {
  return /\.(?:cs|csproj|props|targets|json)$/i.test(path);
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
