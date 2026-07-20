import asyncio
import json
import logging
import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

import aiomqtt
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("bluetti-api")

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
DB_PATH = os.getenv("DB_PATH", "/data/bluetti.db")
MAX_HISTORY_ROWS = 100_000
GRID_INPUT_FIELDS = ("ac_input_power", "grid_charge_power")
TOTAL_SOLAR_INPUT_FIELDS = ("dc_input_power", "pv_input_power", "solar_power")
PV1_INPUT_FIELDS = ("dc_input_1_power", "pv1_power", "dc_input_power1")
PV2_INPUT_FIELDS = ("dc_input_2_power", "pv2_power", "dc_input_power2")
INPUT_MAX_FIELDS = (
    *TOTAL_SOLAR_INPUT_FIELDS,
    *PV1_INPUT_FIELDS,
    *PV2_INPUT_FIELDS,
)
GENERATION_FIELD = "power_generation"

# ── Database ──────────────────────────────────────────────────────────────────

def db_connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def db_init():
    with db_connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS readings (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                device    TEXT    NOT NULL,
                field     TEXT    NOT NULL,
                value     TEXT    NOT NULL,
                ts        TEXT    NOT NULL
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_device_field_ts ON readings(device, field, ts)")
        conn.commit()

def db_insert(device: str, field: str, value: str):
    ts = datetime.now(timezone.utc).isoformat()
    with db_connect() as conn:
        conn.execute(
            "INSERT INTO readings (device, field, value, ts) VALUES (?, ?, ?, ?)",
            (device, field, value, ts)
        )
        conn.commit()
    return ts

def db_list_devices() -> list[str]:
    """List device keys with index seeks instead of scanning all telemetry rows."""
    with db_connect() as conn:
        rows = conn.execute("""
            WITH RECURSIVE devices(device) AS (
                SELECT MIN(device) FROM readings
                UNION ALL
                SELECT (
                    SELECT MIN(device)
                    FROM readings
                    WHERE device > devices.device
                )
                FROM devices
                WHERE device IS NOT NULL
            )
            SELECT device FROM devices WHERE device IS NOT NULL
        """).fetchall()
    return [row["device"] for row in rows]

def db_list_fields(device: str) -> list[str]:
    """List a device's field keys using the device/field index prefix."""
    with db_connect() as conn:
        rows = conn.execute("""
            WITH RECURSIVE fields(field) AS (
                SELECT MIN(field) FROM readings WHERE device=?
                UNION ALL
                SELECT (
                    SELECT MIN(field)
                    FROM readings
                    WHERE device=? AND field > fields.field
                )
                FROM fields
                WHERE field IS NOT NULL
            )
            SELECT field FROM fields WHERE field IS NOT NULL
        """, (device, device)).fetchall()
    return [row["field"] for row in rows]

def first_numeric_value(state: dict[str, float], fields: tuple[str, ...]) -> float | None:
    for field in fields:
        if field in state:
            return state[field]
    return None

def current_solar_input_watts(state: dict[str, float]) -> float:
    total_solar_input = first_numeric_value(state, TOTAL_SOLAR_INPUT_FIELDS)
    if total_solar_input is not None:
        return total_solar_input

    split_solar_input = (
        (first_numeric_value(state, PV1_INPUT_FIELDS) or 0.0)
        + (first_numeric_value(state, PV2_INPUT_FIELDS) or 0.0)
    )

    return split_solar_input

# ── WebSocket connection manager ──────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.clients: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.clients.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.clients:
            self.clients.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.clients:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.clients.remove(ws)

manager = ConnectionManager()

# Latest values cache — { device: { field: { value, ts } } }
latest: dict = {}

# ── MQTT subscriber loop ──────────────────────────────────────────────────────

async def mqtt_loop():
    while True:
        try:
            async with aiomqtt.Client(hostname=MQTT_HOST, port=MQTT_PORT) as client:
                log.info(f"Connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
                await client.subscribe("bluetti/state/#")
                async for message in client.messages:
                    # Topic format: bluetti/state/<DEVICE>/<FIELD>
                    parts = str(message.topic).split("/")
                    if len(parts) < 4:
                        continue
                    device = parts[2]
                    field  = parts[3]
                    value  = message.payload.decode()

                    ts = db_insert(device, field, value)

                    if device not in latest:
                        latest[device] = {}
                    latest[device][field] = {"value": value, "ts": ts}

                    await manager.broadcast({
                        "device": device,
                        "field":  field,
                        "value":  value,
                        "ts":     ts,
                    })
        except Exception as e:
            log.warning(f"MQTT connection failed: {e} — retrying in 5s")
            await asyncio.sleep(5)

# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    db_init()
    task = asyncio.create_task(mqtt_loop())
    yield
    task.cancel()

app = FastAPI(title="Bluetti API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST endpoints ────────────────────────────────────────────────────────────

@app.get("/status")
def get_status():
    """Latest value for every field on every device."""
    return latest

@app.get("/status/{device}")
def get_device_status(device: str):
    """Latest values for a single device."""
    if device not in latest:
        return {}
    return latest[device]

@app.get("/history/{device}/{field}")
def get_history(
    device: str,
    field:  str,
    limit:  int            = Query(default=500, le=MAX_HISTORY_ROWS),
    since:  Optional[str]  = Query(default=None, description="ISO8601 timestamp"),
):
    """
    Historical readings for one device/field.
    Optionally filter with ?since=2024-01-01T00:00:00Z
    """
    with db_connect() as conn:
        if since:
            rows = conn.execute(
                "SELECT value, ts FROM readings WHERE device=? AND field=? AND ts>=? "
                "ORDER BY ts DESC LIMIT ?",
                (device, field, since, limit)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT value, ts FROM readings WHERE device=? AND field=? "
                "ORDER BY ts DESC LIMIT ?",
                (device, field, limit)
            ).fetchall()
    return [{"value": r["value"], "ts": r["ts"]} for r in rows]

@app.get("/history/{device}")
def get_history_bundle(
    device: str,
    fields: str = Query(description="Comma-separated field names"),
    limit: int = Query(default=500, le=MAX_HISTORY_ROWS),
    since: Optional[str] = Query(default=None, description="ISO8601 timestamp"),
):
    """
    Historical readings for multiple fields on one device.
    Returns { field: [{ value, ts }] } so estimate consumers can load a coherent
    telemetry window without a fan-out of one-field requests.
    """
    requested = [field.strip() for field in fields.split(",") if field.strip()]
    if not requested:
        return {}

    placeholders = ",".join("?" for _ in requested)
    params: list[object] = [device, *requested]
    since_clause = ""
    if since:
        since_clause = "AND ts>=?"
        params.append(since)
    params.append(limit)

    with db_connect() as conn:
        rows = conn.execute(
            f"""
            SELECT field, value, ts
            FROM (
                SELECT
                    field,
                    value,
                    ts,
                    ROW_NUMBER() OVER (PARTITION BY field ORDER BY ts DESC) AS rn
                FROM readings
                WHERE device=? AND field IN ({placeholders}) {since_clause}
            )
            WHERE rn <= ?
            ORDER BY field, ts DESC
            """,
            params,
        ).fetchall()

    bundled: dict[str, list[dict[str, str]]] = {field: [] for field in requested}
    for row in rows:
        bundled[row["field"]].append({"value": row["value"], "ts": row["ts"]})
    return bundled

@app.get("/stats/{device}/input-max")
def get_input_max(
    device: str,
    since: Optional[str] = Query(default=None, description="ISO8601 timestamp"),
    until: Optional[str] = Query(default=None, description="Exclusive ISO8601 timestamp"),
    bucket_seconds: int = Query(default=60, ge=1, le=3600),
):
    """
    Highest sustained solar/DC input watts for a device in the requested timestamp window.
    Seeds state from the latest value before the window, then walks only the
    bounded field stream so split input fields are reconstructed coherently.
    The reported peak is the highest bucket average, which avoids promoting
    short telemetry bursts as the day's meaningful solar high.
    """
    placeholders = ",".join("?" for _ in INPUT_MAX_FIELDS)
    stats_fields = (*INPUT_MAX_FIELDS, GENERATION_FIELD)
    stats_placeholders = ",".join("?" for _ in stats_fields)

    state: dict[str, float] = {}
    if since:
        with db_connect() as conn:
            baseline_rows = conn.execute(
                f"""
                SELECT field, value, ts
                FROM (
                    SELECT
                        field,
                        value,
                        ts,
                        ROW_NUMBER() OVER (PARTITION BY field ORDER BY ts DESC) AS rn
                    FROM readings
                    WHERE device=?
                      AND field IN ({placeholders})
                      AND ts<?
                )
                WHERE rn = 1
                """,
                [device, *INPUT_MAX_FIELDS, since],
            ).fetchall()

        for row in baseline_rows:
            try:
                state[row["field"]] = float(row["value"])
            except (TypeError, ValueError):
                continue

    params: list[object] = [device, *stats_fields]
    window_clauses = []
    if since:
        window_clauses.append("AND ts>=?")
        params.append(since)
    if until:
        window_clauses.append("AND ts<?")
        params.append(until)
    window_clause = "\n              ".join(window_clauses)

    with db_connect() as conn:
        rows = conn.execute(
            f"""
            SELECT field, value, ts
            FROM readings
            WHERE device=?
              AND field IN ({stats_placeholders})
              {window_clause}
            ORDER BY ts ASC
            """,
            params,
        ).fetchall()

    # Baseline values reconstruct the complete input state when the first
    # in-window field arrives, but readings before `since` are not themselves
    # candidates for the bounded window's peak.
    bucket_seconds_value = bucket_seconds if isinstance(bucket_seconds, int) else 60
    buckets: dict[int, list[float]] = {}
    for row in rows:
        if row["field"] == GENERATION_FIELD:
            continue

        try:
            value = float(row["value"])
        except (TypeError, ValueError):
            continue

        state[row["field"]] = value
        total = current_solar_input_watts(state)
        try:
            timestamp = datetime.fromisoformat(row["ts"])
        except (TypeError, ValueError):
            continue
        bucket = int(timestamp.timestamp() // bucket_seconds_value)
        buckets.setdefault(bucket, []).append(total)

    sustained_peak = None
    for values in buckets.values():
        if not values:
            continue
        average = sum(values) / len(values)
        sustained_peak = average if sustained_peak is None else max(sustained_peak, average)

    generation_points: list[tuple[datetime, float]] = []
    previous_generation: float | None = None
    for row in rows:
        if row["field"] != GENERATION_FIELD:
            continue

        try:
            value = float(row["value"])
            timestamp = datetime.fromisoformat(row["ts"])
        except (TypeError, ValueError):
            continue

        if previous_generation is None or value != previous_generation:
            generation_points.append((timestamp, value))
            previous_generation = value

    generation_peak = None
    for (previous_ts, previous_value), (current_ts, current_value) in zip(generation_points, generation_points[1:]):
        delta_kwh = current_value - previous_value
        elapsed_hours = (current_ts - previous_ts).total_seconds() / 3600
        if delta_kwh <= 0 or elapsed_hours <= 0:
            continue

        watts = delta_kwh * 1000 / elapsed_hours
        generation_peak = watts if generation_peak is None else max(generation_peak, watts)

    peak = sustained_peak
    if peak is not None and generation_peak is not None:
        peak = min(peak, generation_peak)

    return {"value": peak}

@app.get("/devices")
def get_devices():
    """List all devices seen so far."""
    return db_list_devices()

@app.get("/fields/{device}")
def get_fields(device: str):
    """List all fields recorded for a device."""
    return db_list_fields(device)

# ── WebSocket endpoint ────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """
    Live stream of all MQTT updates.
    Each message: { device, field, value, ts }
    On connect, the current latest snapshot is sent immediately.
    """
    await manager.connect(ws)
    try:
        await ws.send_json({"type": "snapshot", "data": latest})
        while True:
            await ws.receive_text()   # keep connection alive, ignore client messages
    except WebSocketDisconnect:
        manager.disconnect(ws)
