import assert from "node:assert/strict";
import test from "node:test";
import { getSignalIsolationOptions } from "../monitor/shared.mjs";

test("signal isolation creates a hidden detached process group only on Windows", () => {
  assert.deepEqual(getSignalIsolationOptions(true, "win32"), {
    detached: true,
    windowsHide: true,
  });
  assert.deepEqual(getSignalIsolationOptions(true, "linux"), {});
  assert.deepEqual(getSignalIsolationOptions(false, "win32"), {});
});
