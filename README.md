# Bluetti Monitor

Full monitoring stack for the Bluetti AC500 power station with a real-time desktop and web dashboard.

```
[AC500] --BLE-- [bluetti-mqtt on host] --MQTT--> [Mosquitto] --> [FastAPI] --> [Dashboard]
```

| Service | Description | Port |
|---|---|---|
| `mosquitto` | MQTT broker | 1883 |
| `api` | FastAPI REST + WebSocket server | 8000 |
| `dashboard` | React monitoring UI | 8540 |
| `analytics` | Standalone React analytics workspace | 5300 |

### Component Ownership

| Component | Responsibility | Entry Point |
|-----------|----------------|-------------|
| Desktop shell (`src/bun/`) | Native window, tray/icon behavior, notifications, titlebar telemetry | `npm run desktop:dev` |
| Monitor supervisor (`scripts/monitor/`) | Docker services, local dev API/dashboard, and host bridge startup | `npm run monitor:start` / `npm run monitor:dev` |
| Node bridge (`bluetti-mqtt-node`) | BLE device polling, MQTT publishing | `bluetti-mqtt-node --broker mqtt://localhost:1883 <MAC>` |
| Python API (`api/`) | MQTT subscription, data persistence, REST/WebSocket serving | `uvicorn main:app --reload` |
| Analytics app (`analytics/`) | Historical telemetry exploration, derived metrics, dense field comparison | `npm run dev` from `analytics/` |

Each component owns one clear part of the runtime flow with no duplicate BLE or MQTT code paths.

---

## Features

- **AC500-focused overview** built around the telemetry this device actually exposes
- **Real-time monitoring** via WebSocket with live power and state updates
- **Historical data** stored in SQLite with REST API access
- **Interactive charts** for numeric fields with live refresh behavior
- **Standalone analytics app** for historical power balance, battery movement, and arbitrary numeric field comparison
- **Runtime and charge estimates** with confidence/source details and optional historical calibration
- **Raw data table** with search and filtering
- **Mock-mode dashboard tests** for responsive UI verification without hardware

---

## Folder Structure

```text
bluetti-monitor/
|-- docker-compose.yml
|-- api/
|   |-- Dockerfile
|   |-- main.py              # FastAPI server + MQTT subscriber
|   `-- requirements.txt
|-- dashboard/
|   |-- Dockerfile
|   |-- nginx.conf
|   |-- package.json
|   |-- vite.config.ts
|   |-- playwright.config.ts
|   |-- public/
|   |-- src/
|   |   |-- components/      # Reusable UI components
|   |   |-- pages/           # Overview, Charts, Raw Data
|   |   |-- lib/
|   |   |   |-- fields.ts    # Field definitions & categories
|   |   |   |-- api.ts       # API client + mock-mode support
|   |   |   `-- time.ts      # Time formatting utilities
|   |   `-- store/           # Zustand state management
|   `-- tests/               # Playwright coverage for layout/navigation
|-- analytics/
|   |-- package.json
|   |-- vite.config.ts        # Vite API/WS proxy configuration
|   |-- README.md
|   `-- src/
|       |-- components/       # Dense uPlot time-series component
|       |-- lib/              # API client, field metadata, analytics transforms
|       `-- App.tsx           # Standalone analytics surface
|-- mosquitto/
|   `-- mosquitto.conf
`-- src/
    |-- bun/                 # Electrobun desktop bootstrap and orchestration
    `-- mainview/            # Native loading screen while services start
```

---

## Setup

### 0. Clone With Submodules

`bluetti-mqtt-node` now lives in this repo as a git submodule at `lib/bluetti-mqtt-node`.

Fresh clone:

```powershell
git clone --recurse-submodules git@github.com:lnorton89/bluetti-monitor.git
cd bluetti-monitor
```

If you already cloned the repo:

```powershell
git submodule update --init --recursive
```

When the submodule changes upstream:

```powershell
git submodule update --remote --merge
```

### 1. Start the Monitor

Run the supported browser-first startup path from the repo root:

```powershell
npm install
npm run monitor:start
```

That command:

- starts the Docker-backed app services
- resolves the Bluetti device on the Windows host with discovery first and the known fallback MAC if needed
- launches `bluetti-mqtt-node` through the linked workspace CLI
- prints the local dashboard URL plus any LAN URLs it discovers

Primary dashboard URL:

```text
http://localhost:8540
```

### Verification

Run the migration smoke check with:

```powershell
npm run monitor:verify
```

Prerequisites: Docker running, AC500 powered on, Bluetooth available on the Windows host.

Successful verification means:

- the dashboard is reachable at `http://localhost:8540`
- the API is reachable at `http://localhost:8000`
- a one-shot `bluetti-mqtt-node` publish becomes visible through the API after the bridge runs once

### Optional Desktop Shell For Local Development

The Electrobun desktop shell is still available, but it is a local development convenience layer rather than the primary app startup path. It no longer starts Docker, the API, the dashboard, or the BLE bridge; it only attaches a native window to an already-running dashboard.

```powershell
bun install
npm run desktop:start
```

For iterative work with file watching:

```powershell
npm run desktop:dev
```

Use the monitor dev supervisor when you want the local API, Vite dashboard, and host bridge:

```powershell
npm run monitor:dev
```

For the complete live development flow, run:

```powershell
npm run dev:all
```

`dev:all` starts the local API, Vite dashboard, analytics app, Electrobun shell, MQTT broker, and the real AC500 bridge. It launches the desktop with `BLUETTI_DASHBOARD_URL=http://127.0.0.1:5400` unless you already set a different dashboard URL.

Every child process is labeled in the terminal and written as timestamped JSON lines to `.dev-data/logs/dev-all.log`. The log is bounded and rotates automatically, making it the primary place to correlate Electrobun, API, dashboard, analytics, discovery, and BLE bridge startup.

The real AC500 is mandatory in this flow, but a temporary Bluetooth outage is not fatal. If discovery or the bridge fails, the UI services remain online while the bridge supervisor retries. During preflight, the supervisor:

- reports whether the checked-out `bluetti-mqtt-node` revision matches the parent repository's gitlink
- rebuilds stale TypeScript CLI output or the Windows BLE helper before connecting
- watches submodule TypeScript and helper source inputs
- rebuilds and restarts only the bridge when those inputs change; Electrobun and the web services stay running

By default the desktop shell loads `http://localhost:8540`. Set `BLUETTI_DASHBOARD_URL=http://127.0.0.1:5400` before `npm run desktop:dev` when you want the native window to attach to the Vite dashboard.

---

## Dashboard Pages

### Overview

AC500-specific layout built around the data this device actually reports:
- **Hero snapshot**: battery reserve, net balance, and live device state
- **Input Bus**: Combined AC/DC input plus separate DC1/DC2 power and voltage
- **Output Bus**: AC/DC output state and present load
- **Internal Bus**: internal AC/DC electrical channels and split-phase state
- **Switchboard and Identity**: output toggles, mode flags, firmware, serial, and connection details

### Charts

Add time-series charts for any numeric field:
- Select device and field from dropdowns
- Choose data point limit (50/200/500)
- Multiple charts can be displayed simultaneously
- Charts refresh when new live data arrives

### Raw Data

Complete field listing with search:
- All fields sorted by category
- Search by field key or label
- Shows current value and last update time

---

## Analytics App

The standalone analytics app lives in `analytics/` and is meant for deeper telemetry exploration without crowding the main monitoring dashboard.

```powershell
cd analytics
npm install
npm run dev
```

Analytics dev URL:

```text
http://localhost:5300
```

In development, Vite proxies `/api/*` to the FastAPI service at `http://localhost:8000/*` and proxies `/ws` to the API WebSocket. Mock mode is available with `VITE_MOCK_DATA=1` or `http://localhost:5300/?mock=1`.

See [analytics/README.md](analytics/README.md) for the app-specific setup, API expectations, source map, and development notes.

---

## REST API

Base URL: `http://localhost:8000`

Interactive docs: `http://localhost:8000/docs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Latest values for all devices |
| GET | `/status/{device}` | Latest values for one device |
| GET | `/devices` | List of all seen devices |
| GET | `/fields/{device}` | All fields recorded for a device |
| GET | `/history/{device}/{field}` | Historical readings |
| GET | `/history/{device}` | Bundled historical readings for multiple fields |

### History Query Params

| Param | Default | Max | Description |
|-------|---------|-----|-------------|
| `limit` | 500 | 100000 | Max rows to return per field |
| `since` | - | - | ISO8601 timestamp (e.g., `2024-01-01T00:00:00Z`) |
| `fields` | - | - | Comma-separated field list for bundled history endpoint |

### Example

```text
GET /history/AC5002237000003358/dc_input_power?limit=100
```

```json
[
  { "value": "420", "ts": "2024-11-01T12:00:00+00:00" },
  { "value": "418", "ts": "2024-11-01T11:59:55+00:00" }
]
```

Bundled history example:

```text
GET /history/AC5002237000003358?fields=dc_input_power,ac_output_power,total_battery_percent&limit=500&since=2026-05-01T00:00:00Z
```

```json
{
  "dc_input_power": [
    { "value": "420", "ts": "2026-05-01T12:00:00+00:00" }
  ],
  "ac_output_power": [
    { "value": "135", "ts": "2026-05-01T12:00:00+00:00" }
  ],
  "total_battery_percent": [
    { "value": "74", "ts": "2026-05-01T12:00:00+00:00" }
  ]
}
```

---

## WebSocket

URL: `ws://localhost:8000/ws`

On connect, a full snapshot of current values is sent immediately. Subsequent messages are individual field updates as they arrive from the device.

### Snapshot (on connect)

```json
{
  "type": "snapshot",
  "data": {
    "AC5002237000003358": {
      "dc_input_power": { "value": "420", "ts": "..." },
      "ac_output_power": { "value": "135", "ts": "..." },
      "pack_details1": { "percent": 64, "voltage": 54.2 }
    }
  }
}
```

### Live Update

```json
{
  "device": "AC5002237000003358",
  "field": "dc_input_power",
  "value": "421",
  "ts": "2024-11-01T12:00:05+00:00"
}
```

### Node.js Example

```js
const ws = new WebSocket('ws://localhost:8000/ws');

ws.on('message', (raw) => {
  const msg = JSON.parse(raw);
  if (msg.type === 'snapshot') {
    console.log('Initial state:', msg.data);
  } else {
    console.log(`${msg.field} = ${msg.value}`);
  }
});
```

---

## Data Categories

Fields are organized into 5 categories:

| Category | Description | Example Fields |
|----------|-------------|----------------|
| **Input** | Power, voltage, frequency, and current entering the system | `dc_input_power`, `dc_input_1_power`, `dc_input_2_power`, `ac_input_voltage`, `ac_input_frequency` |
| **Output** | Power delivered to loads | `ac_output_power`, `dc_output_on` |
| **Battery** | Battery state and charge window | `total_battery_percent`, `battery_range_start`, `battery_range_end` |
| **Modes** | Operating modes and control states | `ups_mode`, `grid_charge_on`, `time_control_on` |
| **System** | Internal electrical and device diagnostics | `internal_power_one`, `dsp_version`, `serial_number` |

---

## Useful Commands

```powershell
# View logs for all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f api
docker compose logs -f dashboard

# Restart a single service
docker compose restart api

# Rebuild after code changes
docker compose up -d --build dashboard

# Start the desktop shell
npm run desktop:start

# Start local API, Vite dashboard, and host bridge for development
npm run monitor:dev

# Start local monitor dev services and the desktop shell together
npm run dev:all

# Follow the unified labeled development log
Get-Content .dev-data\logs\dev-all.log -Wait

# Run focused supervisor/preflight tests
npm run dev:supervisor:test

# Start the supported browser-first monitor flow
npm run monitor:start

# Run the browser-first migration smoke check
npm run monitor:verify

# Run the estimate backtest report
npm run estimate:backtest

# Stop everything
docker compose down

# Stop and wipe all data volumes
docker compose down -v
```

---

## Development

### Dependency Layout

- `lib/bluetti-mqtt-node` is a separate repo tracked as a submodule.
- If the folder looks empty or out of date, run `git submodule update --init --recursive`.
- Changes inside `lib/bluetti-mqtt-node` must be committed and pushed from that repo, then the parent repo should commit the updated submodule pointer.

### Supported Startup Flow

- Normal monitoring uses `npm run monitor:start`.
- That command targets the Docker-backed dashboard at `http://localhost:8540`.
- The host bridge still runs on Windows, but it is launched for you through the linked `bluetti-mqtt-node` CLI instead of a separate manual host-poller step.
- Local API/dashboard development uses `npm run monitor:dev`, which starts Mosquitto, the local FastAPI server, the Vite dashboard at `http://127.0.0.1:5400`, and the host bridge.
- The desktop shell is optional local tooling and attaches to `BLUETTI_DASHBOARD_URL` or `http://localhost:8540` by default.
- `monitor:dev` consumes the compiled CLI and helper from the checked-out submodule directly. It rebuilds stale artifacts and retries real-device discovery without terminating the API or dashboard.
- Source changes below `lib/bluetti-mqtt-node/src/` rebuild the Node CLI; relevant changes below `lib/bluetti-mqtt-node/helper/BluettiMqtt.BluetoothHelper/` republish the Windows helper. Generated `dist/` and `artifacts/` changes do not trigger rebuild loops.

### Dashboard

```powershell
cd dashboard
npm install
npm run dev
```

Vite dev server runs on `http://localhost:5400` with proxy to `localhost:8000`.

To run the Playwright suite from the repo root:

```powershell
npm run dashboard:test
```

### Dashboard E2E Tests

```powershell
cd dashboard
npx playwright install chromium
npm run test:e2e
```

The Playwright suite runs the dashboard in `?mock=1` mode so it can validate launch layout, navigation, and responsive behavior without Docker, the API, or a live Bluetti device.

### Analytics

```powershell
cd analytics
npm install
npm run dev
```

Vite dev server runs on `http://localhost:5300` with proxy to `localhost:8000`.

For mock data:

```powershell
$env:VITE_MOCK_DATA = '1'
npm run dev
```

### API

```powershell
cd api
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Tech Stack

- **Backend**: Python, FastAPI, aiomqtt, SQLite
- **Frontend**: React, TypeScript, Vite, Zustand, Recharts, uPlot, TanStack Query
- **Infrastructure**: Docker, Mosquitto MQTT, nginx, Electrobun
