import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const LOCK_APP_ID = "dev.lawrence.bluetti-monitor";
const LOCK_FILE_NAME = "monitor-start.lock";

export function getMonitorLockPath() {
  const base = process.platform === "win32"
    ? (process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"))
    : join(homedir(), ".local", "state");
  return join(base, LOCK_APP_ID, LOCK_FILE_NAME);
}

/**
 * Claims the single cross-process monitor-stack lock so the Docker stack and
 * BLE bridge are only ever started once, regardless of whether the caller is
 * `npm run monitor:start`, the Task Scheduler boot script, or the installed
 * desktop app's self-start path.
 */
export function acquireMonitorLock(label) {
  const lockPath = getMonitorLockPath();
  const existing = readLockOwner(lockPath);
  if (existing && isProcessAlive(existing.pid)) {
    return { acquired: false, existing };
  }

  mkdirSync(dirname(lockPath), { recursive: true });
  writeFileSync(
    lockPath,
    JSON.stringify({ pid: process.pid, label, startedAt: new Date().toISOString() }),
  );
  return { acquired: true };
}

/** Releases the lock, but only if this process still owns it. */
export function releaseMonitorLock() {
  const lockPath = getMonitorLockPath();
  const existing = readLockOwner(lockPath);
  if (existing?.pid === process.pid) {
    rmSync(lockPath, { force: true });
  }
}

function readLockOwner(lockPath) {
  if (!existsSync(lockPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(lockPath, "utf8"));
  } catch {
    return null;
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
