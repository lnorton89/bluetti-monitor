---
status: awaiting_human_verify
trigger: "When launching via npm run dev:all a separate terminal opens running python.exe; it should run silently without the additional blank terminal window."
created: 2026-07-29
updated: 2026-07-29T10:48:00-07:00
---

# Dev-all Python window

## Symptoms

- Expected: `npm run dev:all` starts the Python API in the background without opening another visible terminal window.
- Actual: Windows Terminal opens a separate, mostly blank tab/window whose process is the API virtual environment's `python.exe`.
- Errors: No error message is visible.
- Timeline: Reported against the current development supervisor; whether an older implementation behaved differently is unknown.

## Reproduction

1. Run `npm run dev:all` on Windows.
2. Observe the additional Windows Terminal surface running `api/.venv/Scripts/python.exe`.

## Current Focus

hypothesis: Confirmed — Node `detached: true` creates the visible Python console on Windows even with `windowsHide`; precise Python creation flags provide isolation without a console.
test: Self-verification passed; awaiting confirmation in the user's interactive Windows Terminal workflow.
expecting: `npm run dev:all` opens the normal app surfaces but no additional blank Python terminal/tab.
next_action: User runs `npm run dev:all` and reports either "confirmed fixed" or what extra surface still appears.

## Evidence

- timestamp: 2026-07-29T09:35:00-07:00
  checked: Repository worktree before investigation
  found: `scripts/dev-all.mjs`, `scripts/dev-desktop.mjs`, `scripts/monitor/bridge-dev.mjs`, `scripts/monitor/dev.mjs`, and `scripts/monitor/shared.mjs` already have uncommitted edits.
  implication: The likely fix area overlaps existing user work, so the current diff must be preserved and understood before any edit.
- timestamp: 2026-07-29T09:42:00-07:00
  checked: Complete `dev:all` to monitor API spawn path
  found: `dev-all.mjs` starts `monitor/dev.mjs` hidden; `spawnAttachedCommand` also defaults to `windowsHide: true`. The API is uniquely passed `isolateSignals: true`, which becomes `{ detached: true, windowsHide: true }` on Windows.
  implication: A missing `windowsHide` is not the current cause. The Python-specific differentiator is Windows detachment, an environment/process-creation pattern rather than API logic.
- timestamp: 2026-07-29T09:42:00-07:00
  checked: Current worktree diff
  found: The existing uncommitted changes already add `windowsHide: true` broadly and eliminate npm shell wrappers, but they retain Python API `isolateSignals: true`.
  implication: If the visible Python terminal persists with these edits, broad hidden-window settings are insufficient and the detachment flag is the remaining high-probability mechanism.
- timestamp: 2026-07-29T09:49:00-07:00
  checked: Git history for API signal isolation
  found: Commit `d77d95a` deliberately added Windows detachment after a Uvicorn reload signal propagated through the shared console and stopped the supervisor; its live validation confirmed detachment kept the supervisor and bridge alive.
  implication: Removing `detached` would regress a confirmed shutdown bug. The fix must retain process-group isolation and target window creation/wrapper behavior instead.
- timestamp: 2026-07-29T09:49:00-07:00
  checked: Node.js v22 child-process documentation
  found: `detached` prepares a child to run independently, while `windowsHide` specifically hides the subprocess console window on Windows and defaults to false.
  implication: Explicit `windowsHide: true` on every supervisor layer is the supported mechanism compatible with the required detachment.
- timestamp: 2026-07-29T09:52:00-07:00
  checked: Focused Python process-creation probe
  found: Attached Python inherited the caller's windowless context (`GetConsoleWindow() == 0`). Detached Python allocated a console handle with or without `windowsHide`.
  implication: Console allocation alone does not establish visibility; the next probe must directly query whether Windows marks the allocated console window visible.
- timestamp: 2026-07-29T09:56:00-07:00
  checked: Visibility-aware Python process-creation probe
  found: `detached: true` produced `IsWindowVisible() == 1` both with and without `windowsHide: true`; attached Python reported no console window.
  implication: The current Node detachment mechanism is the direct cause of the extra visible Python console, and adding more `windowsHide` options cannot fix it.
- timestamp: 2026-07-29T10:03:00-07:00
  checked: Two-level Windows creation-flags probe
  found: An attached Python wrapper spawning its child with `CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW` produced `GetConsoleWindow() == 0` and `IsWindowVisible() == 0`.
  implication: Windows supports the exact required combination—independent process group without console UI—but Node's high-level `detached` option cannot express it.
- timestamp: 2026-07-29T10:13:00-07:00
  checked: Initial regression run after routing the Windows API through `api/dev_server.py`
  found: All 15 API tests and all 10 supervisor tests passed.
  implication: The launcher preserves existing tested behavior; the obsolete Node detachment helper can now be removed to prevent reuse of the disproven mechanism.
- timestamp: 2026-07-29T10:18:00-07:00
  checked: Regression suites after removing the Node detachment helper
  found: All 15 API tests and all 9 remaining supervisor tests passed.
  implication: No automated regression remains; exact live reproduction is ready for verification.
- timestamp: 2026-07-29T10:25:00-07:00
  checked: Bounded live `dev:all` launch
  found: API status and dashboard both reached HTTP 200. The process tree showed Node supervising `api/dev_server.py`, which in turn launched Uvicorn with the tested windowless process-group flags. No Windows Terminal process appeared in the process inventory, and terminating root PID 5764 removed the full launched tree.
  implication: Original startup behavior is fixed under the observable environment; reload isolation remains to be regression-tested live.
- timestamp: 2026-07-29T10:40:00-07:00
  checked: First live reload probe
  found: The root supervisor and API remained healthy, but Uvicorn emitted no startup/reload lines into the unified log and the serving PID did not change after a watched file edit.
  implication: Before claiming full verification, the launcher must explicitly forward standard streams and the reload path must be retested; startup success alone is insufficient.
- timestamp: 2026-07-29T10:48:00-07:00
  checked: Final bounded live launch after explicit stream forwarding
  found: API and dashboard reached HTTP 200; Uvicorn logs appeared in the unified supervisor log; WatchFiles detected `reload_probe.py` and reloaded; root supervisor PID 31852 remained alive; API status stayed HTTP 200.
  implication: The fix preserves startup, unified logging, Uvicorn reload, and supervisor isolation while using the proven windowless process-group flags.
- timestamp: 2026-07-29T10:48:00-07:00
  checked: Final cleanup and regression run
  found: Terminating root PID 31852 removed its complete process tree and left no listeners on ports 8000, 5400, or 5300. All 15 API tests and all 9 supervisor tests passed; `git diff --check` passed.
  implication: Automated and live verification are complete; only the user's visual confirmation remains.

## Eliminated

- hypothesis: Explicit `windowsHide: true` is sufficient to hide a Node-spawned detached Python process.
  evidence: Direct runtime probe showed the detached Python console was visible (`IsWindowVisible() == 1`) even with `windowsHide: true`.
  timestamp: 2026-07-29T09:56:00-07:00

## Root Cause

On Windows, the monitor API's `isolateSignals: true` option maps to Node `detached: true`. Node/libuv creates a separate visible console for that detached Python process, and `windowsHide: true` does not hide it on this host. The detachment itself is required to prevent Uvicorn reload signals from terminating the shared supervisor, so the bug is the overly broad process-creation primitive rather than missing hide options.

## Resolution

- Added `api/dev_server.py`, a Windows-only launch layer that starts Uvicorn with `CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW` and explicitly forwards standard streams.
- Routed the Windows API through that launcher while retaining the direct Uvicorn command on non-Windows platforms.
- Removed the obsolete Node `detached` isolation helper and its inaccurate regression test.
- Added API unit coverage for the exact Windows flags, Uvicorn command, and stream forwarding.

## Validation

- 15/15 API tests pass.
- 9/9 supervisor tests pass.
- Live `dev:all` API and dashboard readiness pass.
- Live Uvicorn WatchFiles reload occurs without terminating the root supervisor.
- Window-flag probe reports no console handle for `CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW`.
- `git diff --check` passes.
