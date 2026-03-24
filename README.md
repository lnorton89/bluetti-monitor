# Bluetti Monitor

Full monitoring stack for the Bluetti AC500 power station with real-time dashboard.

```
[AC500] --BLE-- [bluetti-mqtt on host] --MQTT--> [Mosquitto] --> [FastAPI] --> [Dashboard]
```

| Service | Description | Port |
|---|---|---|
| `mosquitto` | MQTT broker | 1883 |
| `api` | FastAPI REST + WebSocket server | 8000 |
| `dashboard` | React monitoring UI | 8540 |

---

## Features

- **Real-time monitoring** via WebSocket with live power flow visualization
- **Historical data** stored in SQLite with REST API access
- **Categorized data views**: Input (Solar/Grid), Output, Battery, Modes, System
- **Interactive charts** for any numeric field
- **Raw data table** with search and filtering

---

## Folder Structure

```
bluetti-monitor/
├── docker-compose.yml
├── api/
│   ├── Dockerfile
│   ├── main.py              # FastAPI server + MQTT subscriber
│   └── requirements.txt
├── dashboard/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.ts
│   ├── public/
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Overview, Charts, Raw Data
│       ├── lib/
│       │   ├── fields.ts    # Field definitions & categories
│       │   ├── api.ts       # API client
│       │   └── time.ts      # Time formatting utilities
│       └── store/           # Zustand state management
└── mosquitto/
    └── mosquitto.conf
```

---

## Setup

### 1. Start Docker Services

```powershell
cd bluetti-monitor
docker compose up -d
```

This builds and starts all three containers. First run will take a minute to build the React app.

### 2. Start the Bluetooth Poller (Host)

Bluetooth cannot be passed through to Docker on Windows, so this runs directly on your host machine:

```powershell
bluetti-mqtt --broker localhost 24:4C:AB:2C:24:8E
```

Replace the MAC address with your AC500's address.

### 3. Open the Dashboard

```
http://localhost:8540
```

---

## Dashboard Pages

### Overview
Real-time power flow visualization and categorized field values:
- **Power Flow**: Visual diagram showing solar input, grid input, battery level, and loads
- **Input**: Solar (PV1/PV2) and grid power/voltage/current
- **Output**: AC and DC output measurements and states
- **Battery**: Battery level, voltage, current, temperature, and pack details
- **Modes**: Operating modes, charging states, and power controls
- **System**: Internal temperatures, fan status, and diagnostics

### Charts
Add time-series charts for any numeric field:
- Select device and field from dropdowns
- Choose data point limit (50/200/500)
- Multiple charts can be displayed simultaneously
- Charts auto-refresh every 10 seconds

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

```
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
| **Input** | Power/voltage/current entering the system | `dc_input_power`, `pv1_voltage`, `ac_input_frequency` |
| **Output** | Power delivered to loads | `ac_output_power`, `dc_output_on` |
| **Battery** | Battery state and pack details | `total_battery_percent`, `pack_details1-6` |
| **Modes** | Operating modes and control states | `ups_mode`, `grid_charge_on`, `eco_mode` |
| **System** | Internal diagnostics | `internal_temp`, `fan_speed`, `error_code` |

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

# Stop everything
docker compose down

# Stop and wipe all data volumes
docker compose down -v
```

---

## Development

### Dashboard

```powershell
cd dashboard
npm install
npm run dev
```

Vite dev server runs on `http://localhost:5173` with proxy to `localhost:8000`.

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
- **Infrastructure**: Docker, Mosquitto MQTT, nginx
