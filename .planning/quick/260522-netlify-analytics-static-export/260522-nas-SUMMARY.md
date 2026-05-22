---
status: complete
---

# Quick Task 260522-nas: Netlify Static Analytics Export

## Completed

- Added `analytics/scripts/export-static-data.mjs`, which exports the local API's last 7 days into `analytics/public/analytics-data.json` as flattened history rows plus status/device/field metadata.
- Added `npm run export:production-data` and `npm run build:production`; the existing `npm run build` still uses the API-backed app behavior.
- Added static frontend mode via `VITE_STATIC_ANALYTICS=1`, loading the exported JSON and disabling the WebSocket/live refresh behavior.
- Added `analytics/netlify.toml` for an analytics-root Netlify deploy.
- Documented the export/static build flow in `analytics/README.md`.
- Ignored the generated static data file so private telemetry is not accidentally committed.

## Verification

- Ran `npm run build` in `analytics/`; passed.
- Ran `npm run export:production-data` in `analytics/`; wrote a 7-day data file from the local API.
- Ran `npm run build:production` in `analytics/`; passed and included `dist/analytics-data.json`.
