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
    limit:  int            = Query(default=500, le=5000),
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

@app.get("/devices")
def get_devices():
    """List all devices seen so far."""
    with db_connect() as conn:
        rows = conn.execute("SELECT DISTINCT device FROM readings").fetchall()
    return [r["device"] for r in rows]

@app.get("/fields/{device}")
def get_fields(device: str):
    """List all fields recorded for a device."""
    with db_connect() as conn:
        rows = conn.execute(
            "SELECT DISTINCT field FROM readings WHERE device=?", (device,)
        ).fetchall()
    return [r["field"] for r in rows]

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
