# Quick Task 260522-nas: Netlify Static Analytics Export

## Goal

Make the standalone analytics app deployable to Netlify with a non-dev build that reads a flattened last-7-days JSON export instead of requiring the local API or WebSocket.

## Tasks

1. Add a static analytics data exporter
   - Files: `analytics/scripts/export-static-data.mjs`, `analytics/package.json`
   - Action: Fetch status/devices/fields/history from the local API, flatten the last 7 days into `public/analytics-data.json`, and expose an npm script for it.
   - Verify: Run the exporter against the local API or confirm it fails clearly when unavailable.

2. Add static-data frontend mode
   - Files: `analytics/src/lib/api.ts`, `analytics/src/App.tsx`, `analytics/.env.static`
   - Action: Load exported data when `VITE_STATIC_ANALYTICS=1`, disable WebSocket/live behavior, and keep the existing `build` script API-backed.
   - Verify: Run TypeScript/Vite build for normal and static modes.

3. Add Netlify convenience config
   - Files: `analytics/netlify.toml`
   - Action: Document the production build command and publish directory for an analytics-root Netlify deploy.
   - Verify: Static build produces `dist/`.
