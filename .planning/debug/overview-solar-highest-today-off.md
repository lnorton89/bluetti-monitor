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
- timestamp: 2026-06-30T00:05:00Z
  observation: The reported `2,217 W` value is a real raw telemetry maximum from today's 06:00-18:00 local window; both aggregate and split input fields spike around 21:43 UTC.
- timestamp: 2026-06-30T00:05:00Z
  observation: Raw sample max is too sensitive for the Overview headline. Against today's local DB, a 60-second bucketed peak lowers the value from `2,217 W` to about `1,826 W`.

## Eliminated

- hypothesis: The 6 AM to 6 PM peak window was missing or ignored.
  reason: Existing `daily-input-window` tests and API `until` handling still pass; this session found field precedence, not window bounds, as the active bug.

## Resolution

- root_cause: The overview solar peak path first preferred split PV/DC fields over the aggregate `dc_input_power` total, and then still surfaced the highest raw telemetry sample as the headline value. On the AC500 local telemetry, those raw samples can include short bursts that are real readings but misleading as "Highest today."
- fix: Prefer aggregate solar total fields (`dc_input_power`, `pv_input_power`, `solar_power`) when available, use split PV/DC fields only as a fallback, and report the highest 60-second bucket average for the Overview/API solar peak instead of the raw maximum sample. Overview now refreshes the sustained peak once per minute during the daylight window instead of merging instantaneous live spikes.
- verification: `bun test dashboard/test-unit/power.test.ts dashboard/test-unit/notifications.test.ts dashboard/test-unit/daily-input-window.test.ts`; `api/.venv/Scripts/python.exe api/test_input_max.py`; `npm --prefix dashboard run build`; `python -m py_compile api/main.py`; local DB simulation returned about `1,826 W` for the same window that had raw max `2,217 W`.
- files_changed: api/main.py, api/test_input_max.py, dashboard/src/lib/api.ts, dashboard/src/lib/power.ts, dashboard/src/pages/Overview.tsx, dashboard/test-unit/power.test.ts, dashboard/test-unit/notifications.test.ts
