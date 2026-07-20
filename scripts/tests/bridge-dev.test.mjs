import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  classifyBridgeChange,
  createBridgeDevSupervisor,
  getBridgeWorkspacePaths,
  inspectBridgeArtifacts,
} from "../monitor/bridge-dev.mjs";

test("classifyBridgeChange separates JavaScript and native helper inputs", () => {
  assert.equal(classifyBridgeChange("src/app/server.ts"), "javascript");
  assert.equal(classifyBridgeChange("package.json"), "javascript");
  assert.equal(
    classifyBridgeChange("helper/BluettiMqtt.BluetoothHelper/Program.cs"),
    "helper",
  );
  assert.equal(classifyBridgeChange("dist/cli/bluetti-mqtt.js"), null);
  assert.equal(classifyBridgeChange("artifacts/helper/win-x64/helper.exe"), null);
});

test("inspectBridgeArtifacts detects missing, stale, and fresh generated outputs", () => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "bluetti-bridge-artifacts-"));
  const paths = getBridgeWorkspacePaths(workspaceRoot);

  try {
    assert.equal(inspectBridgeArtifacts(paths).initialized, false);

    mkdirSync(paths.sourceRoot, { recursive: true });
    mkdirSync(paths.helperSourceRoot, { recursive: true });
    mkdirSync(join(paths.bridgeRoot, "dist", "cli"), { recursive: true });
    mkdirSync(join(paths.bridgeRoot, "artifacts", "helper", "win-x64"), { recursive: true });
    writeFileSync(paths.packagePath, "{}", "utf8");
    writeFileSync(paths.tsconfigPath, "{}", "utf8");
    const sourcePath = join(paths.sourceRoot, "index.ts");
    const helperSourcePath = join(paths.helperSourceRoot, "Program.cs");
    writeFileSync(sourcePath, "export {};", "utf8");
    writeFileSync(helperSourcePath, "class Program {}", "utf8");
    writeFileSync(paths.bridgeCliPath, "", "utf8");
    writeFileSync(paths.discoveryCliPath, "", "utf8");
    writeFileSync(paths.helperArtifactPath, "", "utf8");

    const oldTime = new Date("2026-01-01T00:00:00Z");
    const newTime = new Date("2026-01-02T00:00:00Z");
    for (const input of [paths.packagePath, paths.tsconfigPath, sourcePath, helperSourcePath]) {
      utimesSync(input, oldTime, oldTime);
    }
    for (const artifact of [paths.bridgeCliPath, paths.discoveryCliPath, paths.helperArtifactPath]) {
      utimesSync(artifact, newTime, newTime);
    }

    const fresh = inspectBridgeArtifacts(paths);
    assert.equal(fresh.javascriptStale, false);
    assert.equal(fresh.helperStale, false);

    utimesSync(sourcePath, new Date("2026-01-03T00:00:00Z"), new Date("2026-01-03T00:00:00Z"));
    assert.equal(inspectBridgeArtifacts(paths).javascriptStale, true);
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test("supervisor keeps the stack alive while discovery retries", async () => {
  let discoveryAttempts = 0;
  let spawned = 0;
  const messages = [];
  const child = new EventEmitter();
  child.pid = 123;
  child.exitCode = null;
  child.killed = false;

  const supervisor = createBridgeDevSupervisor({
    workspaceRoot: "C:/workspace",
    retryDelayMs: 5,
    watchSubmodule: false,
    preflightFn: async () => {},
    resolveDeviceAddressFn: async () => {
      discoveryAttempts += 1;
      if (discoveryAttempts === 1) {
        throw new Error("device temporarily unavailable");
      }
      return { mac: "AA:BB:CC:DD:EE:FF", source: "discovery" };
    },
    spawnAttachedCommandFn: () => {
      spawned += 1;
      return child;
    },
    stopProcessFn: async () => {},
    logger: {
      info: (message) => messages.push(message),
      warn: (message) => messages.push(message),
    },
  });

  await supervisor.start();
  await waitFor(() => spawned === 1);

  assert.ok(discoveryAttempts >= 2);
  assert.equal(spawned, 1);
  assert.match(messages.join("\n"), /Stack remains online/);
  assert.equal(supervisor.getState().bridgePid, 123);

  await supervisor.stop();
});

test("supervisor reuses the discovered AC500 address after a bridge exit", async () => {
  let discoveryAttempts = 0;
  const children = [];
  const supervisor = createBridgeDevSupervisor({
    workspaceRoot: "C:/workspace",
    retryDelayMs: 5,
    watchSubmodule: false,
    preflightFn: async () => {},
    resolveDeviceAddressFn: async () => {
      discoveryAttempts += 1;
      return { mac: "AA:BB:CC:DD:EE:FF", source: "discovery" };
    },
    spawnAttachedCommandFn: () => {
      const child = new EventEmitter();
      child.pid = 100 + children.length;
      child.exitCode = null;
      child.killed = false;
      children.push(child);
      return child;
    },
    stopProcessFn: async () => {},
    logger: { info() {}, warn() {} },
  });

  await supervisor.start();
  await waitFor(() => children.length === 1);
  children[0].exitCode = 1;
  children[0].emit("close", 1);
  await waitFor(() => children.length === 2);

  assert.equal(discoveryAttempts, 1);

  await supervisor.stop();
});

async function waitFor(predicate) {
  const deadline = Date.now() + 500;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5));
  }
  throw new Error("Timed out waiting for test condition");
}
