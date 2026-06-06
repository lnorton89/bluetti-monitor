---
status: complete
completed: "2026-06-05T17:27:30.6982322-07:00"
quick_id: 260605-o2a
slug: decouple-electrobun-desktop-dev-startup-
---

# Summary

Decoupled the Electrobun desktop shell from monitor stack orchestration.

## Completed

- Made `src/bun/index.ts` passive: it now loads `BLUETTI_DASHBOARD_URL` or `http://localhost:8540`, uses `BLUETTI_API_URL` only for titlebar telemetry, and shows an unavailable-dashboard page instead of starting services.
- Removed the desktop-owned Bluetooth launch adapter at `src/bun/bluetooth.ts`.
- Added `scripts/monitor/dev.mjs` for local API, Vite dashboard, Mosquitto, and host bridge development startup.
- Expanded `scripts/monitor/shared.mjs` with local-dev helpers for command resolution, Python venv setup, attached process logging, and cleanup.
- Simplified `scripts/dev-desktop.mjs` so `desktop:dev` supervises only Electrobun.
- Added `scripts/dev-all.mjs` and package scripts for `monitor:dev` and `dev:all`.
- Updated README and the desktop loading view to document the new ownership split.

## Verification

- `node --check scripts\monitor\shared.mjs; node --check scripts\monitor\dev.mjs; node --check scripts\dev-desktop.mjs; node --check scripts\dev-all.mjs`
- `bunx tsc --noEmit`
- leftover-reference search for old desktop startup ownership returned no matches
- package script assertion passed

## Follow-Up Fix

- Fixed `npm run dev:all` so its desktop child gets `BLUETTI_DASHBOARD_URL=http://127.0.0.1:5173` by default, matching the Vite server started by `monitor:dev`.
- Added desktop dashboard readiness polling before showing the unavailable page, so the native window can survive the expected startup race between the desktop process and Vite.
- Re-ran `node --check` for changed scripts, `bunx tsc --noEmit`, and a package/script wiring assertion.

## Not Run

- `npm run monitor:dev`
- `npm run monitor:start`
- `npm run monitor:verify`

These were intentionally not run because they can start Docker services, BLE discovery, and the host bridge against local hardware.
