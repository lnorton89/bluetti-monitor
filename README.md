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

### Component Ownership

| Component | Responsibility | Entry Point |
|-----------|----------------|-------------|
| Desktop shell (`src/bun/`) | Stack orchestration, service startup, Bluetooth launch | `npm run desktop:dev` |
| Node bridge (`bluetti-mqtt-node`) | BLE device polling, MQTT publishing | `bluetti-mqtt-node --broker mqtt://localhost:1883 <MAC>` |
| Python API (`api/`) | MQTT subscription, data persistence, REST/WebSocket serving | `uvicorn main:app --reload` |

Each component owns one clear part of the runtime flow with no duplicate BLE or MQTT code paths.

---

## Features

- **AC500-focused overview** built around the telemetry this device actually exposes
- **Real-time monitoring** via WebSocket with live power and state updates
- **Historical data** stored in SQLite with REST API access
- **Interactive charts** for numeric fields with live refresh behavior
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

The Electrobun desktop shell is still available, but it is a local development convenience layer rather than the primary app startup path.

```powershell
bun install
npm run desktop:start
```

For iterative work with file watching:

```powershell
npm run desktop:dev
```

In local development mode the desktop shell runs the FastAPI API on `http://127.0.0.1:8000`, starts the Vite dashboard on `http://127.0.0.1:5173`, and loads that local dev UI into the native window. The browser-first monitoring flow for normal use remains `npm run monitor:start` on `http://localhost:8540`.

---

## Dashboard Pages

### Overview

AC500-specific layout built around the data this device actually reports:
- **Hero snapshot**: battery reserve, net balance, and live device state
- **Input Bus**: AC input and DC input power, voltage, frequency, and current
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

### History Query Params

| Param | Default | Max | Description |
|-------|---------|-----|-------------|
| `limit` | 500 | 5000 | Max rows to return |
| `since` | - | - | ISO8601 timestamp (e.g., `2024-01-01T00:00:00Z`) |

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
| **Input** | Power, voltage, frequency, and current entering the system | `dc_input_power`, `ac_input_voltage`, `ac_input_frequency` |
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

# Start the supported browser-first monitor flow
npm run monitor:start

# Run the browser-first migration smoke check
npm run monitor:verify

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
- The desktop shell is optional local tooling and still uses the Vite dev server on `http://127.0.0.1:5173`.

### Dashboard

```powershell
cd dashboard
npm install
npm run dev
```

Vite dev server runs on `http://localhost:5173` with proxy to `localhost:8000`.

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

### API

```powershell
cd api
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Tech Stack

- **Backend**: Python, FastAPI, aiomqtt, SQLite
- **Frontend**: React, TypeScript, Vite, Zustand, Recharts
- **Infrastructure**: Docker, Mosquitto MQTT, nginx, Electrobun
