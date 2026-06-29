---
status: resolved
trigger: "highest today on overview for solar is way off"
created: 2026-06-29
updated: 2026-06-29
---

# Debug Session: overview-solar-highest-today-off

## Symptoms

- Expected behavior: Overview > Input > Highest today should show a trustworthy highest solar/DC input value for today.
- Actual behavior: The displayed value is way off.
- Error messages: None reported.
- Timeline: Reported 2026-06-29 after recent overview peak changes.
- Reproduction: Open the overview page and inspect the solar/input "Highest today" value.

## Current Focus

- hypothesis: The overview solar peak calculation is using the wrong field set or time window after the recent peak refactors.
- test: Inspect dashboard peak helpers, API input-max reconstruction, and existing peak regression tests.
- expecting: Find a mismatch between live solar input, historical fields, or daylight/today window handling.
- next_action: resolved
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-29T23:52:00Z
  observation: The local `.dev-data/bluetti-dev.db` contained 1,988 `dc_input_power` samples in today's 06:00-18:00 local window, but only 346 samples for each split field (`dc_input_1_power`, `dc_input_2_power`).
- timestamp: 2026-06-29T23:52:00Z
  observation: `dashboard/src/lib/power.ts`, `dashboard/src/pages/Overview.tsx`, and `api/main.py` all preferred split solar fields whenever they were non-zero, even when the aggregate `dc_input_power` field was present and fresher.
- timestamp: 2026-06-29T23:52:00Z
  observation: Existing tests locked in split-first behavior, so stale split-field inflation was not covered.
- timestamp: 2026-06-29T23:52:00Z
  observation: Targeted regressions now cover aggregate solar precedence in the dashboard helper and stale split fields in the API input-max endpoint.

## Eliminated

- hypothesis: The 6 AM to 6 PM peak window was missing or ignored.
  reason: Existing `daily-input-window` tests and API `until` handling still pass; this session found field precedence, not window bounds, as the active bug.

## Resolution

- root_cause: The overview solar peak path preferred split PV/DC fields over the aggregate `dc_input_power` total. On the AC500 local telemetry, the aggregate field updates much more frequently than the split fields, so the UI and API could combine stale split values and show an inflated or otherwise misleading "Highest today" value.
- fix: Prefer aggregate solar total fields (`dc_input_power`, `pv_input_power`, `solar_power`) when available, and use split PV/DC fields only as a fallback. Applied the same rule to the shared dashboard helper, the Overview hero, the mock peak calculation through the shared helper, and the API input-max reconstruction.
- verification: `bun test dashboard/test-unit/power.test.ts dashboard/test-unit/notifications.test.ts dashboard/test-unit/daily-input-window.test.ts`; `api/.venv/Scripts/python.exe api/test_input_max.py`; `npm --prefix dashboard run build`; `python -m py_compile api/main.py`.
- files_changed: api/main.py, api/test_input_max.py, dashboard/src/lib/power.ts, dashboard/src/pages/Overview.tsx, dashboard/test-unit/power.test.ts, dashboard/test-unit/notifications.test.ts
