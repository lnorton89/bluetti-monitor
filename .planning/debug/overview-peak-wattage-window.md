---
status: resolved
trigger: peak wattage on overview is STILL NOT RIGHT! the window of peak should be from 6am to 6pm daily. do not stop until you've fixed it correctly. don't guess
created: "2026-06-16T14:30:57.5405513-07:00"
updated: "2026-06-16T14:48:00.0000000-07:00"
---

# Debug Session: Overview Peak Wattage Window

## Symptoms

- Expected behavior: Overview peak wattage uses the daily 6:00 AM to 6:00 PM local-time window.
- Actual behavior: Overview peak wattage is still wrong after a prior full-calendar-day fix.
- Error messages: None reported.
- Timeline: Still failing as of 2026-06-16.
- Reproduction: Open overview and inspect the peak/highest input wattage value.

## Current Focus

- hypothesis: Overview still queries from local midnight and merges the live reading, so the value can include readings outside the 6 AM to 6 PM daily window.
- test: Inspect overview query parameters, API filtering, and input-max reconstruction; add regression coverage for the bounded window.
- expecting: Query should send local-day 06:00 and 18:00 bounds, API should honor both, and live readings outside the window should not affect the peak.
- next_action: resolved
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: "2026-06-16T14:30:57.5405513-07:00"
  observation: dashboard/src/pages/Overview.tsx computes todaySinceIso with local midnight and fetches /stats/{device}/input-max?since=<midnight>.
- timestamp: "2026-06-16T14:30:57.5405513-07:00"
  observation: Overview computes highestInputToday as max(API peak, liveInput), which can include live readings before 06:00 or after 18:00.
- timestamp: "2026-06-16T14:30:57.5405513-07:00"
  observation: api/main.py input-max endpoint accepts only since and scans all later rows, so it cannot enforce an upper 18:00 bound.
- timestamp: "2026-06-16T14:48:00.0000000-07:00"
  observation: The prior peak-wattage debug fix addressed AC500 split input fields but did not address the daily time window.
- timestamp: "2026-06-16T14:48:00.0000000-07:00"
  observation: API peak reconstruction needs latest pre-window values for each input field; otherwise the first in-window total can be computed from an incomplete field state.
- timestamp: "2026-06-16T14:56:00.0000000-07:00"
  observation: Before 06:00 local time, today's daylight window has not started; the overview must not query a future 06:00 window and let API baseline seeding surface pre-window wattage.

## Eliminated

## Resolution

- root_cause: Overview peak input wattage was still using a local-midnight lower bound and no 18:00 upper bound, and it always merged the live reading even when the current time was outside the required 06:00-18:00 daily window.
- fix: Added an explicit local daily input peak window helper, sent both 06:00 `since` and 18:00 exclusive `until` bounds to the API after the daily window has started, stopped merging live input outside that window, taught mock history about `until`, and updated the API to seed baseline input state before walking bounded rows.
- verification: `bun test dashboard/test-unit/daily-input-window.test.ts`; `bun test .\dashboard\test-unit\daily-input-window.test.ts .\dashboard\test-unit\notifications.test.ts .\dashboard\test-unit\battery-estimates.test.ts`; `api\.venv\Scripts\python.exe api\test_input_max.py`; `bun run --cwd dashboard build`
- files_changed: dashboard/src/lib/daily-input-window.ts, dashboard/src/pages/Overview.tsx, dashboard/src/lib/api.ts, dashboard/src/lib/mock.ts, dashboard/test-unit/daily-input-window.test.ts, api/main.py, api/test_input_max.py
