---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/bun/index.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Nested context objects render as grouped sections instead of flat dot-notation"
    - "Null/undefined context fields are omitted from log output"
    - "ISO timestamp context fields are pruned (redundant with log line timestamp)"
    - "Polling cycle completed entries show a compact summary without the full telemetry dump"
  artifacts:
    - path: "src/bun/index.ts"
      provides: "Improved log formatting for structured payloads"
      contains: "formatGroupedContext"
  key_links:
    - from: "formatStructuredContext"
      to: "formatGroupedContext"
      via: "delegation for nested object rendering"
      pattern: "formatGroupedContext"
    - from: "formatStructuredLogPayload"
      to: "isCompactPollingMessage"
      via: "message-based compact rendering"
      pattern: "isCompactPollingMessage"
---

<objective>
Improve the readability of bluetooth polling log entries in the desktop log file.

Purpose: The current flat dot-notation formatting produces extremely long, undifferentiated lines for polling entries. The telemetry object alone has 14 nested fields all prefixed with `telemetry.`, making logs hard to scan and debug. Grouped rendering and compact summaries will make the log file genuinely useful.

Output: Updated `src/bun/index.ts` with improved formatting functions that produce grouped, noise-reduced log output.
</objective>

<execution_context>
$HOME/.config/opencode/get-shit-done/workflows/execute-plan.md
$HOME/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@src/bun/index.ts
</context>

<interfaces>
<!-- Current formatting pipeline in src/bun/index.ts that this plan modifies -->

Key functions and their signatures (lines 279-361):
```typescript
// Detects library JSON payloads: { message: string, context?: unknown, level?: unknown, timestamp?: unknown }
function isStructuredLogPayload(value: unknown): value is { context?: unknown; level?: unknown; message: string; timestamp?: unknown; }

// Top-level formatter: "message | field1=val1 | field2=val2 | ..."
function formatStructuredLogPayload(payload: { context?: unknown; level?: unknown; message: string; timestamp?: unknown; }): string

// Context formatter with field limit (MAX_LOG_CONTEXT_FIELDS = 14)
function formatStructuredContext(context: unknown): string[]

// Recursive flattener: produces ["telemetry.cycleCount=42", "telemetry.fastCycleCount=30", ...]
function flattenLogContext(value: unknown, prefix = "", depth = 0): string[]

// Scalar renderer for primitives
function renderLogScalar(value: unknown): string
```

Library logger output shape (from lib/bluetti-mqtt-node/src/core/logger.ts):
```typescript
// ConsoleLogger.write() emits JSON strings like:
{ timestamp: "2026-04-22T19:30:00.000Z", level: "debug", message: "Polling cycle completed", context: { address: "24:4C:AB:2C:24:8E", cycleType: "fast", result: "ok", commandCount: 5, cycleDurationMs: 320, nextFastPollInMs: 4000, nextFullPollInMs: 26000, commandDelayMs: 250, telemetry: { cycleCount: 42, fastCycleCount: 30, fullCycleCount: 12, successfulCommandCount: 380, expectedErrorCount: 5, busyErrorCount: 2, commandWriteCount: 0, parserPublishCount: 42, averageCycleDurationMs: 320, averageCommandDurationMs: 48, maxCycleDurationMs: 1200, maxCommandDurationMs: 150, lastCycleStartedAt: "2026-04-22T19:29:57.000Z", lastCycleCompletedAt: "2026-04-22T19:30:00.000Z", lastBusyAt: null, lastErrorAt: null } } }
```

Constants:
- `MAX_LOG_CONTEXT_FIELDS = 14` — field limit before truncation with `... +N more`
</interfaces>

<tasks>
<task type="auto">
<name>Task 1: Rewrite flattenLogContext into formatGroupedContext with grouped rendering, null pruning, and timestamp pruning</name>
<files>src/bun/index.ts</files>
<action>
Replace the `flattenLogContext` function (lines 322-349) and `formatStructuredContext` (lines 306-320) with an improved `formatGroupedContext` function that produces cleaner log output:

1. **Grouped nested-object rendering**: When a context field's value is a non-trivial object (has ≥3 keys), render it as a grouped inline section instead of flattening with dot-notation. Format: `telemetry: { cycleCount=42 fastCycleCount=30 ... }`. Small objects (1-2 keys) still flatten normally since grouping doesn't help there.

2. **Null/undefined pruning**: Skip entries where the leaf value is `null` or `undefined`. This removes noise like `telemetry.lastBusyAt=null` and `telemetry.lastErrorAt=null`.

3. **ISO timestamp pruning**: Detect context values that are ISO 8601 timestamp strings (match pattern `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/`) and omit them from output. The log line already has a timestamp, so fields like `telemetry.lastCycleStartedAt=2026-04-22T19:29:57.000Z` are redundant.

Implementation approach:
- Create `formatGroupedContext(context: unknown): string[]` as the new entry point replacing `formatStructuredContext` + `flattenLogContext`
- Inside, iterate over context entries. For each entry:
  - If the value is `null` or `undefined`, skip it
  - If the value is a string matching ISO timestamp pattern, skip it
  - If the value is a non-trivial object (≥3 enumerable keys), format as `key: { subKey1=val1 subKey2=val2 ... }` with recursive pruning of nulls and timestamps inside the group
  - Otherwise, render as `key=value` (primitives, small objects, arrays)
- Keep the `MAX_LOG_CONTEXT_FIELDS` truncation behavior — after pruning and grouping, if more than 14 fields remain, truncate with `... +N more`
- Remove the old `flattenLogContext` function entirely
- Update `formatStructuredLogPayload` to call `formatGroupedContext` instead of `formatStructuredContext`
- Remove the now-unused `formatStructuredContext` function

Key invariants to preserve:
- The `isStructuredLogPayload` detection and `writeConsoleLine` → `formatLogLines` → `formatLogArg` pipeline stays the same
- `renderLogScalar` stays the same (used for array items)
- Non-polling log entries still render correctly — grouping only applies when the context has nested objects
</action>
<verify>
Run `npx tsc --noEmit` from the project root and confirm no type errors in `src/bun/index.ts`.
</verify>
<done>
- `flattenLogContext` and `formatStructuredContext` functions removed
- `formatGroupedContext` function added with grouped rendering, null pruning, and timestamp pruning
- `formatStructuredLogPayload` updated to call `formatGroupedContext`
- TypeScript compiles cleanly
- Non-object context fields still render as `key=value`
- Nested objects with ≥3 keys render as `key: { sub=val ... }`
- Null/undefined values omitted from output
- ISO timestamp values omitted from output
- MAX_LOG_CONTEXT_FIELDS truncation still works
</done>
</task>

<task type="auto">
<name>Task 2: Add compact polling-cycle summary format for "Polling cycle completed" entries</name>
<files>src/bun/index.ts</files>
<action>
Add a compact rendering path for the most verbose polling log entry — "Polling cycle completed" — which fires every ~4 seconds at DEBUG level and currently dumps the full telemetry object each time.

1. **Detect polling cycle messages**: Add a helper `isCompactPollingMessage(message: string): boolean` that returns `true` when the message is `"Polling cycle completed"`. This is the specific message that needs compact treatment — the telemetry summary and busy warnings are already less frequent and their full context is more useful.

2. **Compact cycle format**: When `isCompactPollingMessage` returns true, format the context as a compact one-liner showing only the essentials:
   - Extract `cycleType`, `result`, `commandCount`, `cycleDurationMs` from the top-level context
   - From the `telemetry` nested object, extract only `cycleCount`, `successfulCommandCount`, and any error counts (`expectedErrorCount`, `busyErrorCount`) if they are > 0
   - Render as: `Polling cycle completed | fast ok 5cmds 320ms | #42 380ok 5err 2busy`
   - If there's no telemetry or it's missing, fall back to the standard grouped format

3. **Integration point**: In `formatStructuredLogPayload`, before delegating to `formatGroupedContext`, check `isCompactPollingMessage(payload.message)`. If true, use the compact formatter instead. The compact formatter returns a single formatted string rather than an array of field strings.

Example transformations:
```
Before: Polling cycle completed | address=24:4C:AB:2C:24:8E | cycleType=fast | result=ok | commandCount=5 | cycleDurationMs=320 | nextFastPollInMs=4000 | nextFullPollInMs=26000 | commandDelayMs=250 | telemetry: { cycleCount=42 fastCycleCount=30 ... 14 fields ... }

After:  Polling cycle completed | fast ok 5cmds 320ms | #42 380ok 5err 2busy
```

When error counts are zero, omit them: `| #42 380ok` instead of `| #42 380ok 0err 0busy`.

Keep the compact format simple and deterministic — no dynamic key discovery, just the known polling fields.
</action>
<verify>
Run `npx tsc --noEmit` from the project root and confirm no type errors. Manually verify the format by checking the logic with known polling payloads:
- `cycleType=fast, result=ok, commandCount=5, cycleDurationMs=320, telemetry: { cycleCount=42, successfulCommandCount=380, expectedErrorCount=5, busyErrorCount=2 }` → should produce `fast ok 5cmds 320ms | #42 380ok 5err 2busy`
- Same with zero errors → should produce `fast ok 5cmds 320ms | #42 380ok`
</verify>
<done>
- `isCompactPollingMessage` helper added
- Compact formatting path for "Polling cycle completed" messages
- Compact format shows: cycleType, result, commandCount, cycleDurationMs, and selective telemetry (cycleCount, successfulCommandCount, non-zero error counts)
- Zero error counts omitted from compact format
- Falls back to standard grouped format if expected fields are missing
- TypeScript compiles cleanly
</done>
</task>
</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors in `src/bun/index.ts`
2. Visual inspection of the new format functions confirms grouped rendering, null/timestamp pruning, and compact polling summaries
</verification>

<success_criteria>
- Nested context objects (≥3 keys) render as `key: { sub=val ... }` instead of flat `key.sub=val` dot-notation
- Null and undefined context values are omitted from log output
- ISO timestamp context values are omitted from log output
- "Polling cycle completed" entries render as compact one-liners with essential fields only
- Non-polling log entries and entries without nested objects still render correctly
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/260422-jma-improve-the-bluetooth-polling-entry-form/260422-jma-SUMMARY.md`
</output>
