---
status: resolved
trigger: "the peak wattage in the overview is STILL not right; Highest today mirrors the current input reading"
created: 2026-06-20
updated: 2026-06-20
---

# Debug Session: overview-highest-today-wrong

## Symptoms

- Expected behavior: The Overview input card's **Highest today** value should retain the highest input wattage observed during the current local day.
- Actual behavior: **Highest today** displays the same 1,603 W value as the current DC input reading.
- Error messages: none reported.
- Timeline: still incorrect after earlier peak-wattage work.
- Reproduction: Open the Overview while live telemetry is flowing and inspect Input > Highest today.

## Current Focus

- hypothesis: confirmed — Overview fetched the server peak once, then compared that stale value only with the instantaneous live input, forgetting higher live values after input fell.
- test: compare the live database and running endpoint with the rendered symptom, then add a falling-input regression.
- expecting: the endpoint returns a higher historical peak than the card while the card mirrors current input.
- next_action: resolved

## Evidence

- 2026-06-20: Prior fixes moved aggregation server-side, added AC500 split-field aliases, and bounded the window to local 06:00–18:00, but none retained live peaks while Overview remained mounted.
- 2026-06-20: The live database and running `/stats/.../input-max` endpoint returned 1,965 W for today's window while the screenshot showed 1,603 W, exactly matching current DC input.
- 2026-06-20: `Overview.tsx` had no refetch interval or live-peak accumulator; `resolveDailyInputPeakValue` compared cached history only with the current sample.
- 2026-06-20: API inspection found pre-window baseline state was initialized as the peak, allowing a before-06:00 value to win a bounded query.
- 2026-06-20: Seven dashboard peak-window tests, two API input-max tests, and the production dashboard build passed.

## Eliminated

## Resolution

- root_cause: Overview forgot live maxima after the instantaneous input fell because its history query was not refreshed while mounted. Separately, the API incorrectly treated pre-window baseline state as a peak candidate.
- fix: Accumulate live input maxima for the active daily window, always refresh server history when Overview mounts, reset accumulation for a new window, and use baseline API state only to reconstruct the first in-window sample.
- verification: Running endpoint returns 1,965 W for 2026-06-20; `bun test dashboard/test-unit/daily-input-window.test.ts`; `api/.venv/Scripts/python.exe api/test_input_max.py`; `bun run --cwd dashboard build`.
- files_changed: dashboard/src/pages/Overview.tsx, dashboard/src/lib/daily-input-window.ts, dashboard/test-unit/daily-input-window.test.ts, api/main.py, api/test_input_max.py
