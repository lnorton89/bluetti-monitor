import asyncio
import json
import logging
import os
import sqlite3
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

import aiomqtt
from fastapi import FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("bluetti-api")

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
DB_PATH = os.getenv("DB_PATH", "/data/bluetti.db")
MAX_HISTORY_ROWS = 100_000
# Retention: raw per-event readings older than RAW_RETENTION_DAYS are rolled up
# into hourly min/max/avg aggregates (readings_hourly), then deleted. Aggregates
# older than AGGREGATE_RETENTION_DAYS are dropped outright. Keeps the readings
# table (an EAV log, one row per field update) from growing unbounded.
RAW_RETENTION_DAYS = int(os.getenv("RAW_RETENTION_DAYS", "30"))
AGGREGATE_RETENTION_DAYS = int(os.getenv("AGGREGATE_RETENTION_DAYS", "365"))
RETENTION_INTERVAL_SECONDS = int(os.getenv("RETENTION_INTERVAL_SECONDS", str(6 * 3600)))
RETENTION_BATCH_LIMIT = 50_000
# Raw payload dump, not surfaced anywhere in the UI (see EXCLUDED_COMPARISON_FIELDS
# in the analytics app) — excluded from persistence entirely rather than retained.
RETIRED_FIELDS = ("_raw",)
# Devices whose newest reading is older than this window are treated as gone and
# excluded from live snapshots. Persisted telemetry rebuilds the snapshot from
# SQLite, so a device that reports once (e.g. a simulated/mock fleet) would
# otherwise linger forever and duplicate real devices in the UI. Set to 0 to
# disable filtering.
DEVICE_ACTIVE_WINDOW_SECONDS = int(os.getenv("DEVICE_ACTIVE_WINDOW_SECONDS", "900"))
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
        conn.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                id    INTEGER PRIMARY KEY CHECK (id = 1),
                value TEXT    NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS readings_hourly (
                device       TEXT    NOT NULL,
                field        TEXT    NOT NULL,
                hour_ts      TEXT    NOT NULL,
                min_value    REAL,
                max_value    REAL,
                avg_value    REAL,
                last_value   TEXT,
                sample_count INTEGER NOT NULL,
                PRIMARY KEY (device, field, hour_ts)
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_hourly_ts ON readings_hourly(hour_ts)")
        conn.commit()

def db_load_app_settings() -> dict:
    with db_connect() as conn:
        row = conn.execute("SELECT value FROM app_settings WHERE id = 1").fetchone()

    if row is None:
        return {}

    try:
        parsed = json.loads(row["value"])
    except (TypeError, ValueError):
        return {}

    return parsed if isinstance(parsed, dict) else {}

def db_save_app_settings(settings: dict) -> None:
    with db_connect() as conn:
        conn.execute(
            "INSERT INTO app_settings (id, value) VALUES (1, ?) "
            "ON CONFLICT(id) DO UPDATE SET value = excluded.value",
            (json.dumps(settings),),
        )
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

def _bucket_hour(ts: str) -> str:
    """Truncate an ISO8601 timestamp to the start of its UTC hour."""
    parsed = datetime.fromisoformat(ts)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.replace(minute=0, second=0, microsecond=0).isoformat()

def raw_retention_cutoff() -> str:
    return (datetime.now(timezone.utc) - timedelta(days=RAW_RETENTION_DAYS)).isoformat()

def db_rollup_older_than(cutoff_iso: str, batch_limit: int = RETENTION_BATCH_LIMIT) -> int:
    """
    Roll up to `batch_limit` raw readings older than `cutoff_iso` into hourly
    min/max/avg/last-value aggregates, then delete those raw rows. Aggregates
    merge with anything already stored for the same (device, field, hour), so
    this is safe to call repeatedly across batches and across separate hours'
    worth of backlog. Returns the number of raw rows processed — call again
    while the result equals `batch_limit` to fully drain the backlog.
    """
    with db_connect() as conn:
        rows = conn.execute(
            "SELECT id, device, field, value, ts FROM readings WHERE ts < ? LIMIT ?",
            (cutoff_iso, batch_limit),
        ).fetchall()
        if not rows:
            return 0

        buckets: dict[tuple[str, str, str], dict] = {}
        ids: list[int] = []
        for row in rows:
            ids.append(row["id"])
            key = (row["device"], row["field"], _bucket_hour(row["ts"]))
            bucket = buckets.setdefault(key, {
                "min": None, "max": None, "sum": 0.0, "numeric_count": 0,
                "count": 0, "last_value": None, "last_ts": None,
            })
            bucket["count"] += 1
            try:
                numeric = float(row["value"])
            except (TypeError, ValueError):
                numeric = None
            if numeric is not None:
                bucket["min"] = numeric if bucket["min"] is None else min(bucket["min"], numeric)
                bucket["max"] = numeric if bucket["max"] is None else max(bucket["max"], numeric)
                bucket["sum"] += numeric
                bucket["numeric_count"] += 1
            if bucket["last_ts"] is None or row["ts"] >= bucket["last_ts"]:
                bucket["last_ts"] = row["ts"]
                bucket["last_value"] = row["value"]

        upserts = [
            (
                device, field, hour,
                bucket["min"], bucket["max"],
                (bucket["sum"] / bucket["numeric_count"]) if bucket["numeric_count"] else None,
                bucket["last_value"], bucket["count"],
            )
            for (device, field, hour), bucket in buckets.items()
        ]
        conn.executemany(
            """
            INSERT INTO readings_hourly
                (device, field, hour_ts, min_value, max_value, avg_value, last_value, sample_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(device, field, hour_ts) DO UPDATE SET
                min_value = CASE
                    WHEN min_value IS NULL THEN excluded.min_value
                    WHEN excluded.min_value IS NULL THEN min_value
                    ELSE MIN(min_value, excluded.min_value)
                END,
                max_value = CASE
                    WHEN max_value IS NULL THEN excluded.max_value
                    WHEN excluded.max_value IS NULL THEN max_value
                    ELSE MAX(max_value, excluded.max_value)
                END,
                avg_value = CASE
                    WHEN avg_value IS NULL THEN excluded.avg_value
                    WHEN excluded.avg_value IS NULL THEN avg_value
                    ELSE (avg_value * sample_count + excluded.avg_value * excluded.sample_count)
                         / (sample_count + excluded.sample_count)
                END,
                last_value = excluded.last_value,
                sample_count = sample_count + excluded.sample_count
            """,
            upserts,
        )

        for i in range(0, len(ids), 500):
            chunk = ids[i:i + 500]
            placeholders = ",".join("?" for _ in chunk)
            conn.execute(f"DELETE FROM readings WHERE id IN ({placeholders})", chunk)

        conn.commit()

    return len(ids)

def db_prune_aggregates_older_than(cutoff_iso: str) -> int:
    with db_connect() as conn:
        cur = conn.execute("DELETE FROM readings_hourly WHERE hour_ts < ?", (cutoff_iso,))
        conn.commit()
        return cur.rowcount

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

def db_load_latest() -> dict:
    """Load the newest recorded value for every device field."""
    snapshot: dict = {}
    with db_connect() as conn:
        for device in db_list_devices():
            fields: dict = {}
            for field in db_list_fields(device):
                row = conn.execute(
                    "SELECT value, ts FROM readings "
                    "WHERE device=? AND field=? "
                    "ORDER BY ts DESC, id DESC LIMIT 1",
                    (device, field),
                ).fetchone()
                if row is not None:
                    fields[field] = {"value": row["value"], "ts": row["ts"]}
            if fields:
                snapshot[device] = fields
    return snapshot

def _device_latest_ts(fields: dict) -> Optional[datetime]:
    """Newest reading timestamp across a device's fields, or None if unparseable."""
    newest: Optional[datetime] = None
    for entry in fields.values():
        raw = entry.get("ts")
        if not raw:
            continue
        try:
            parsed = datetime.fromisoformat(raw)
        except ValueError:
            continue
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        if newest is None or parsed > newest:
            newest = parsed
    return newest

def active_devices(source: dict, window_seconds: int = DEVICE_ACTIVE_WINDOW_SECONDS) -> dict:
    """Drop devices whose newest reading is older than the active window.

    Keeps devices that are still reporting (their timestamps keep advancing) and
    sheds ones that have gone silent, so a device published once never lingers in
    the snapshot alongside live hardware.
    """
    if window_seconds <= 0:
        return source
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
    result: dict = {}
    for device, fields in source.items():
        newest = _device_latest_ts(fields)
        if newest is not None and newest >= cutoff:
            result[device] = fields
    return result

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

                    ts = (
                        datetime.now(timezone.utc).isoformat()
                        if field in RETIRED_FIELDS
                        else db_insert(device, field, value)
                    )

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

async def retention_loop():
    """Periodically rolls raw readings older than RAW_RETENTION_DAYS into hourly
    aggregates and drops aggregates older than AGGREGATE_RETENTION_DAYS."""
    while True:
        try:
            cutoff = raw_retention_cutoff()
            rolled_up = 0
            while True:
                rolled = await asyncio.to_thread(db_rollup_older_than, cutoff)
                rolled_up += rolled
                if rolled < RETENTION_BATCH_LIMIT:
                    break
            if rolled_up:
                log.info("Retention: rolled up %d raw readings older than %s", rolled_up, cutoff)

            agg_cutoff = (datetime.now(timezone.utc) - timedelta(days=AGGREGATE_RETENTION_DAYS)).isoformat()
            pruned = await asyncio.to_thread(db_prune_aggregates_older_than, agg_cutoff)
            if pruned:
                log.info("Retention: pruned %d hourly aggregates older than %s", pruned, agg_cutoff)
        except Exception as e:
            log.warning(f"Retention pass failed: {e} — retrying next interval")

        await asyncio.sleep(RETENTION_INTERVAL_SECONDS)

# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    db_init()
    hydrate_started = time.perf_counter()
    latest.clear()
    latest.update(active_devices(db_load_latest()))
    field_count = sum(len(fields) for fields in latest.values())
    log.info(
        "Hydrated latest telemetry snapshot from SQLite: %d devices, %d fields in %.0fms",
        len(latest),
        field_count,
        (time.perf_counter() - hydrate_started) * 1000,
    )
    mqtt_task = asyncio.create_task(mqtt_loop())
    retention_task = asyncio.create_task(retention_loop())
    yield
    mqtt_task.cancel()
    retention_task.cancel()

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
    """Latest value for every field on every active device."""
    return active_devices(latest)

@app.get("/status/{device}")
def get_device_status(device: str):
    """Latest values for a single device."""
    if device not in latest:
        return {}
    return latest[device]

@app.get("/settings")
def get_app_settings():
    """Persisted dashboard settings (theme, alerts, etc.), shared across whichever origin loaded it."""
    return db_load_app_settings()

@app.post("/settings")
async def save_app_settings(request: Request):
    body = await request.json()
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="settings must be a JSON object")

    db_save_app_settings(body)
    return {"ok": True}

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

    Raw rows only cover the last RAW_RETENTION_DAYS; requests reaching further
    back are backfilled from the hourly readings_hourly aggregates (avg_value,
    or last_value for non-numeric fields) so older trend data stays visible at
    reduced resolution instead of returning nothing.
    """
    cutoff = raw_retention_cutoff()
    with db_connect() as conn:
        if since:
            rows = conn.execute(
                "SELECT value, ts FROM readings WHERE device=? AND field=? AND ts>=? "
                "ORDER BY ts DESC LIMIT ?",
                (device, field, max(since, cutoff), limit)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT value, ts FROM readings WHERE device=? AND field=? "
                "ORDER BY ts DESC LIMIT ?",
                (device, field, limit)
            ).fetchall()

        result = [{"value": r["value"], "ts": r["ts"]} for r in rows]

        remaining = limit - len(result)
        if since and since < cutoff and remaining > 0:
            agg_rows = conn.execute(
                "SELECT avg_value, last_value, hour_ts FROM readings_hourly "
                "WHERE device=? AND field=? AND hour_ts>=? AND hour_ts<? "
                "ORDER BY hour_ts DESC LIMIT ?",
                (device, field, since, cutoff, remaining)
            ).fetchall()
            result.extend(
                {
                    "value": str(r["avg_value"]) if r["avg_value"] is not None else r["last_value"],
                    "ts": r["hour_ts"],
                }
                for r in agg_rows
            )

    return result

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

    cutoff = raw_retention_cutoff()
    raw_since = max(since, cutoff) if since else None

    placeholders = ",".join("?" for _ in requested)
    params: list[object] = [device, *requested]
    since_clause = ""
    if raw_since:
        since_clause = "AND ts>=?"
        params.append(raw_since)
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

        # Backfill ranges older than the raw retention window from hourly aggregates.
        if since and since < cutoff:
            agg_rows = conn.execute(
                f"""
                SELECT field, hour_ts, avg_value, last_value
                FROM (
                    SELECT
                        field, hour_ts, avg_value, last_value,
                        ROW_NUMBER() OVER (PARTITION BY field ORDER BY hour_ts DESC) AS rn
                    FROM readings_hourly
                    WHERE device=? AND field IN ({placeholders}) AND hour_ts>=? AND hour_ts<?
                )
                WHERE rn <= ?
                ORDER BY field, hour_ts DESC
                """,
                [device, *requested, since, cutoff, limit],
            ).fetchall()
            for row in agg_rows:
                bucket = bundled[row["field"]]
                if len(bucket) >= limit:
                    continue
                value = str(row["avg_value"]) if row["avg_value"] is not None else row["last_value"]
                bucket.append({"value": value, "ts": row["hour_ts"]})

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
        await ws.send_json({"type": "snapshot", "data": active_devices(latest)})
        while True:
            await ws.receive_text()   # keep connection alive, ignore client messages
    except WebSocketDisconnect:
        manager.disconnect(ws)
