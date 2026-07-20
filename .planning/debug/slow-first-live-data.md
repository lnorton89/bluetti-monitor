---
status: resolved
trigger: "keep using the supervisor logging to improve things, im sure you can keep finding improvements. start up time definitely improved but time to first actual bit of useful data showing is long"
created: 2026-07-19
updated: 2026-07-19
---

# Slow time to first live data

## Symptoms

- Expected: after `npm run dev:all`, the dashboard should show useful telemetry from the real AC500 shortly after the UI becomes available.
- Actual: the desktop/dashboard surfaces start quickly but remain without current real-device data for noticeably longer.
- Errors: no persistent error; discovery may miss the device once and retry five seconds later.
- Timeline: visible after the recent supervisor and Electrobun startup improvements reduced the non-device startup work.
- Reproduction: start the full dev supervisor with the physical AC500 available and measure session start, UI navigation, discovery, bridge start, and first telemetry timestamps in `.dev-data/logs/dev-all.log`.

## Current Focus

- root_cause: API startup initialized its latest-value cache as empty even though SQLite already contained the most recent real AC500 values, forcing the dashboard to wait for BLE discovery and a new MQTT polling cycle before it could render anything useful.
- fix: hydrate the API snapshot with one indexed newest-row lookup per known device field during startup, preserving original timestamps so the existing dashboard freshness cues remain accurate.
- verification: the real 50-field snapshot hydrates in 9ms; it is API-visible ~2.4s after supervisor start and present before the dashboard's first real route load at ~4.3s, while fresh physical AC500 telemetry replaces it at ~10.3s.

## Evidence

- Clean session `2026-07-20T02:11:24.332Z-31672`: Electrobun navigated to the dashboard at `02:11:27.640Z` (~3.3 s), the first scan missed at `02:11:30.844Z`, the AC500 was discovered at `02:11:41.112Z` (~16.8 s), and first full telemetry completed at `02:11:44.644Z` (~20.3 s).
- The first correct hydration implementation used a full-table window sort and blocked against the real database. Reusing the existing recursive device/field index-seek pattern reduced the real snapshot query to 6.1ms in isolation and 9ms during live API startup.
- API test edits exposed a Windows process-group issue: Uvicorn's reload signal propagated to the shared console and stopped the entire supervisor. The API now runs in a hidden detached Windows process group; a deliberate reload signal left supervisor PID `11172` and the real-device bridge running.
- Final session `2026-07-20T02:19:30.674Z-11172`: API hydration completed at `02:19:33.036Z`, desktop loaded the dashboard at `02:19:34.928Z`, AC500 discovery completed at `02:19:37.216Z`, and the first full fresh polling cycle completed at `02:19:40.988Z`.

## Resolution

- Added `db_load_latest()` using bounded index seeks across the small device/field keyspace and hydrate `latest` before the API accepts connections.
- Added startup timing/count logging so future sessions expose hydration cost directly in the unified supervisor log.
- Isolated the Windows API process group so Uvicorn reload activity cannot terminate Electrobun, analytics, or the BLE bridge.
- Added regression coverage for timestamp-correct snapshot restoration and Windows-only signal isolation.
- All 9 API tests and all 10 supervisor tests pass against the final implementation.
