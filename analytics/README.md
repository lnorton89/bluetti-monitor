# Bluetti Analytics

Standalone analytics dashboard for exploring AC500 telemetry in more detail than the main desktop dashboard. It focuses on historical trends, field comparison, and derived power/battery metrics while using the same FastAPI telemetry surface as the rest of Bluetti Monitor.

## What It Shows

- Live device status from the WebSocket feed.
- Historical charts for solar input, grid input, load, net power, battery percent, battery voltage, and generated energy.
- Range presets from 1 hour through 7 days.
- Derived summaries such as average input/output, peak load, peak solar, solar share, source coverage, battery movement, and charge/discharge balance.
- Dense comparison charts for arbitrary numeric telemetry fields.
- Resolved field transparency so it is clear which raw AC500 fields power each derived metric.

## Requirements

- Node.js/npm compatible with the checked-in lockfile.
- The Bluetti Monitor API running on `http://localhost:8000` for live data, unless using mock mode.

## Setup

From this folder:

```powershell
npm install
npm run dev
```

The dev server runs on `http://localhost:5120`.

## Scripts

```powershell
npm run dev
```

Starts the Vite dev server on `0.0.0.0:5120`. In dev, `/api/*` is proxied to `http://localhost:8000/*` and `/ws` is proxied to the API WebSocket.

```powershell
npm run build
```

Runs TypeScript build checks and creates the normal API-backed production build.

```powershell
npm run export:production-data
```

Exports the last 7 days of local API telemetry into `public/analytics-data.json`. Override the API or window with `ANALYTICS_API_URL`, `ANALYTICS_EXPORT_DAYS`, and `ANALYTICS_EXPORT_LIMIT`.

```powershell
npm run build:production
```

Exports static telemetry, then builds the Netlify-friendly static app. This mode reads `analytics-data.json`, disables WebSocket/live refresh behavior, and includes the data file in `dist/`.

```powershell
npm run preview
```

Serves the production build locally.

## Configuration

The app reads these optional Vite environment variables:

- `VITE_API_URL`: API base URL. Defaults to `/api`.
- `VITE_WS_URL`: WebSocket URL. Defaults to `/ws` on the current host.
- `VITE_MOCK_DATA`: Set to `1` to use built-in mock telemetry.
- `VITE_STATIC_ANALYTICS`: Set to `1` to read `analytics-data.json` instead of calling the API or WebSocket.

Mock mode can also be enabled in the browser with:

```text
http://localhost:5120/?mock=1
```

PowerShell example:

```powershell
$env:VITE_MOCK_DATA = '1'
npm run dev
```

## API Expectations

The analytics app expects the FastAPI service to expose:

- `GET /status`
- `GET /devices`
- `GET /fields/{device}`
- `GET /history/{device}?fields=field_a,field_b&since=<iso>&limit=<n>`
- `WS /ws`

Historical values are expected as string values with ISO timestamps. Numeric analytics are derived only from fields whose current or historical values can be parsed as numbers.

## Source Map

- `src/App.tsx`: Main analytics page, live telemetry hook, query wiring, controls, and panels.
- `src/lib/api.ts`: API client, WebSocket message types, and mock telemetry.
- `src/lib/analytics.ts`: Field resolution, bucketing, summaries, peak detection, and derived timeline calculations.
- `src/lib/fields.ts`: Field labels, units, categories, and value formatting.
- `src/components/DenseTimeSeries.tsx`: uPlot wrapper for dense numeric field comparison.
- `vite.config.ts`: Vite, Tailwind, API proxy, and WebSocket proxy configuration.

## Development Notes

- The app is intentionally separate from `dashboard/` so heavier exploratory charts and analytics controls do not complicate the main monitoring surface.
- Field aliases in `src/lib/analytics.ts` are conservative. Add new aliases there when live telemetry proves another AC500 field maps to an existing metric.
- Mock data is deterministic enough for layout work, but final validation should use the real API because available fields vary by device and firmware.
