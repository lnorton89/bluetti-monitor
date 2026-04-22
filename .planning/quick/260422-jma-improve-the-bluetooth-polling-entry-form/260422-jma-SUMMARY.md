---
phase: quick
plan: 01
subsystem: desktop-logging
tags: [log-formatting, bluetooth-polling, devex]
dependency_graph:
  requires: []
  provides: [formatGroupedContext, isCompactPollingMessage, formatCompactPollingCycle]
  affects: [src/bun/index.ts]
tech_stack:
  added: [ISO_TIMESTAMP_PATTERN regex constant]
  patterns: [grouped-inline-object-rendering, compact-message-formatting]
key_files:
  created: []
  modified:
    - src/bun/index.ts
decisions:
  - "Non-trivial objects (>=3 keys) render as grouped inline sections; small objects (1-2 keys) flatten normally"
  - "Compact polling format only applies to 'Polling cycle completed' — other messages use grouped format"
  - "Compact format falls back to grouped format if expected fields are missing"
metrics:
  duration: ~5min
  completed: 2026-04-22
---

# Quick Task 260422-jma: Improve the Bluetooth Polling Entry Form Summary

Improved log formatting for structured payloads in the desktop log file, replacing flat dot-notation with grouped rendering and adding compact summaries for polling cycle entries.

## Changes Made

### Task 1: Rewrite flattenLogContext into formatGroupedContext

Replaced `flattenLogContext` and `formatStructuredContext` with `formatGroupedContext` + `formatGroupedEntries`:

- **Grouped nested-object rendering**: Objects with >=3 keys render as `key: { subKey1=val1 subKey2=val2 ... }` instead of `key.subKey1=val1 | key.subKey2=val2 | ...`. Small objects (1-2 keys) still flatten as `key=value` via `String(value)`.
- **Null/undefined pruning**: Entries where the leaf value is `null` or `undefined` are silently omitted (e.g., `telemetry.lastBusyAt=null` disappears).
- **ISO timestamp pruning**: String values matching `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/` are omitted (e.g., `telemetry.lastCycleStartedAt=2026-04-22T19:29:57.000Z` is pruned since the log line already has a timestamp).
- **MAX_LOG_CONTEXT_FIELDS truncation** preserved at 14 fields with `... +N more` suffix.

Added helpers: `isNonTrivialObject`, `isIsoTimestamp`, `ISO_TIMESTAMP_PATTERN` constant.

### Task 2: Add compact polling-cycle summary format

Added `isCompactPollingMessage` and `formatCompactPollingCycle`:

- `isCompactPollingMessage(message)` returns true for `"Polling cycle completed"` only.
- Compact format: `Polling cycle completed | fast ok 5cmds 320ms | #42 380ok 5err 2busy`
  - Cycle segment: cycleType + result + commandCount + "cmds" + cycleDurationMs + "ms"
  - Telemetry segment: "#" + cycleCount + successfulCommandCount + "ok" + non-zero error counts
- Zero error counts are omitted (e.g., `380ok` instead of `380ok 0err 0busy`)
- Falls back to standard grouped format if expected fields are missing (returns `null`)

### Format Comparison

**Before (flat, 20+ fields):**
```
Polling cycle completed | address=24:4C:AB:2C:24:8E | cycleType=fast | result=ok | commandCount=5 | cycleDurationMs=320 | nextFastPollInMs=4000 | nextFullPollInMs=26000 | commandDelayMs=250 | telemetry.cycleCount=42 | telemetry.fastCycleCount=30 | telemetry.fullCycleCount=12 | telemetry.successfulCommandCount=380 | telemetry.expectedErrorCount=5 | telemetry.busyErrorCount=2 | telemetry.commandWriteCount=0 | telemetry.parserPublishCount=42 | telemetry.averageCycleDurationMs=320 | telemetry.averageCommandDurationMs=48 | telemetry.maxCycleDurationMs=1200 | telemetry.maxCommandDurationMs=150 | telemetry.lastCycleStartedAt=2026-04-22T19:29:57.000Z | telemetry.lastCycleCompletedAt=2026-04-22T19:30:00.000Z | telemetry.lastBusyAt=null | telemetry.lastErrorAt=null
```

**After (compact):**
```
Polling cycle completed | fast ok 5cmds 320ms | #42 380ok 5err 2busy
```

**After (grouped, non-compact message like "Polling telemetry summary"):**
```
Polling telemetry summary | address=24:4C:AB:2C:24:8E | fastIntervalMs=4000 | fullIntervalMs=30000 | commandDelayMs=250 | telemetry: { cycleCount=42 fastCycleCount=30 fullCycleCount=12 successfulCommandCount=380 expectedErrorCount=5 busyErrorCount=2 commandWriteCount=0 parserPublishCount=42 averageCycleDurationMs=320 averageCommandDurationMs=48 maxCycleDurationMs=1200 maxCommandDurationMs=150 }
```

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx -p typescript tsc --noEmit` passes with no errors
- `renderLogScalar` preserved for array item rendering
- `isStructuredLogPayload` detection and `writeConsoleLine` pipeline unchanged
- Non-polling log entries still render correctly via grouped format

## Self-Check: PASSED

- FOUND: src/bun/index.ts
- FOUND: commit 3362046 in git log
- FOUND: .planning/quick/260422-jma-improve-the-bluetooth-polling-entry-form/260422-jma-SUMMARY.md
