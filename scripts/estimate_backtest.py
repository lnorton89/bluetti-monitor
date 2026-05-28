import argparse
import os
import sqlite3
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import median


DEFAULT_DB = Path(".dev-data/bluetti-dev.db")
REPORT_DIR = Path("reports")
FIELDS = {
    "battery": ["total_battery_percent", "battery_percent", "soc", "charge_level"],
    "ac_input": ["ac_input_power", "grid_charge_power"],
    "dc_input": ["dc_input_power", "pv_input_power", "solar_power"],
    "pv1": ["pv1_power", "dc_input_1_power", "dc_input_power1"],
    "pv2": ["pv2_power", "dc_input_2_power", "dc_input_power2"],
    "ac_output": ["ac_output_power"],
    "dc_output": ["dc_output_power"],
}
DEADBAND_W = 20
MIN_WINDOW_SECONDS = 12 * 60
MAX_WINDOW_SECONDS = 3 * 60 * 60
MIN_SOC_DELTA = 0.4


def parse_ts(value: str) -> float | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def numeric(value: str) -> float | None:
    try:
        parsed = float(value)
    except ValueError:
        return None
    return parsed if parsed == parsed else None


def fetch_devices(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("SELECT DISTINCT device FROM readings ORDER BY device").fetchall()
    return [row[0] for row in rows]


def choose_field(conn: sqlite3.Connection, device: str, aliases: list[str]) -> str | None:
    placeholders = ",".join("?" for _ in aliases)
    row = conn.execute(
        f"""
        SELECT field, COUNT(*) AS count
        FROM readings
        WHERE device=? AND field IN ({placeholders})
        GROUP BY field
        ORDER BY count DESC
        LIMIT 1
        """,
        [device, *aliases],
    ).fetchone()
    return row[0] if row else None


def load_series(conn: sqlite3.Connection, device: str, field: str | None, limit: int) -> list[tuple[float, float]]:
    if field is None:
        return []
    rows = conn.execute(
        """
        SELECT value, ts
        FROM readings
        WHERE device=? AND field=?
        ORDER BY ts DESC
        LIMIT ?
        """,
        (device, field, limit),
    ).fetchall()
    points: list[tuple[float, float]] = []
    for value, ts in rows:
        parsed_value = numeric(value)
        parsed_ts = parse_ts(ts)
        if parsed_value is not None and parsed_ts is not None:
            points.append((parsed_ts, parsed_value))
    points.sort()
    return points


def value_at_or_before(series: list[tuple[float, float]], ts: float) -> float | None:
    match = None
    for point_ts, value in series:
        if point_ts > ts:
            break
        match = value
    return match


def build_rows(series_by_name: dict[str, list[tuple[float, float]]]) -> list[dict[str, float | None]]:
    battery_points = series_by_name.get("battery", [])
    timestamps = [ts for ts, _ in battery_points] if battery_points else sorted({ts for points in series_by_name.values() for ts, _ in points})
    rows = []
    for ts in timestamps:
        row = {"ts": ts}
        for name, series in series_by_name.items():
            row[name] = value_at_or_before(series, ts)
        rows.append(row)
    return rows


def net_power(row: dict[str, float | None], direction: str) -> float:
    total_input = sum(row.get(name) or 0 for name in ("ac_input", "dc_input", "pv1", "pv2"))
    total_output = sum(row.get(name) or 0 for name in ("ac_output", "dc_output"))
    return total_output - total_input if direction == "discharging" else total_input - total_output


def find_windows(rows: list[dict[str, float | None]], direction: str):
    windows = []
    horizons = [15 * 60, 30 * 60, 60 * 60, 2 * 60 * 60, 3 * 60 * 60]
    for start_index, start in enumerate(rows[:-1]):
        start_soc = start.get("battery")
        if start_soc is None:
            continue
        for horizon in horizons:
            end = closest_row_after(rows, start_index, (start["ts"] or 0) + horizon)
            if end is None:
                continue
            elapsed = (end["ts"] or 0) - (start["ts"] or 0)
            if elapsed < MIN_WINDOW_SECONDS:
                continue
            if elapsed > MAX_WINDOW_SECONDS:
                continue
            end_soc = end.get("battery")
            if end_soc is None:
                continue
            delta = end_soc - start_soc
            if abs(delta) < MIN_SOC_DELTA:
                continue
            if direction == "charging" and delta <= 0:
                continue
            if direction == "discharging" and delta >= 0:
                continue
            slice_rows = [row for row in rows[start_index:] if (start["ts"] or 0) <= (row["ts"] or 0) <= (end["ts"] or 0)]
            powers = [net_power(row, direction) for row in slice_rows]
            avg_power = sum(powers) / len(powers) if powers else 0
            if avg_power <= DEADBAND_W:
                continue
            elapsed_hours = elapsed / 3600
            wh_per_percent = avg_power * elapsed_hours / abs(delta)
            if 0 < wh_per_percent < 500:
                windows.append({
                    "direction": direction,
                    "start_soc": start_soc,
                    "end_soc": end_soc,
                    "delta_soc": delta,
                    "minutes": elapsed / 60,
                    "avg_power": avg_power,
                    "wh_per_percent": wh_per_percent,
                })
    return windows


def closest_row_after(rows: list[dict[str, float | None]], start_index: int, target_ts: float):
    best = None
    best_delta = None
    for row in rows[start_index + 1:]:
        row_ts = row["ts"] or 0
        if row_ts < target_ts - 5 * 60:
            continue
        if row_ts > target_ts + 10 * 60:
            break
        delta = abs(row_ts - target_ts)
        if best_delta is None or delta < best_delta:
            best = row
            best_delta = delta
    return best


def summarize_windows(windows: list[dict[str, float]]) -> dict[str, float | int | None]:
    if not windows:
        return {"count": 0, "median_wh_per_percent": None, "median_minutes": None, "median_power": None}
    return {
        "count": len(windows),
        "median_wh_per_percent": median(window["wh_per_percent"] for window in windows),
        "median_minutes": median(window["minutes"] for window in windows),
        "median_power": median(window["avg_power"] for window in windows),
    }


def write_report(device: str, fields: dict[str, str | None], windows_by_direction: dict[str, list[dict[str, float]]]) -> Path:
    REPORT_DIR.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    path = REPORT_DIR / f"estimate-backtest-{stamp}.md"
    lines = [
        f"# Estimate Backtest: {stamp}",
        "",
        f"Device: `{device}`",
        "",
        "## Field Map",
        "",
        "| Logical Field | Source Field |",
        "|---------------|--------------|",
    ]
    for logical, field in fields.items():
        lines.append(f"| {logical} | `{field or 'unavailable'}` |")
    lines.extend(["", "## Summary", ""])
    for direction, windows in windows_by_direction.items():
        summary = summarize_windows(windows)
        lines.extend([
            f"### {direction.title()}",
            "",
            f"- Windows used: {summary['count']}",
            f"- Median effective capacity: {format_capacity(summary['median_wh_per_percent'])}",
            f"- Median window duration: {format_number(summary['median_minutes'], 'min')}",
            f"- Median net power: {format_number(summary['median_power'], 'W')}",
            "",
        ])
    lines.extend([
        "## Notes",
        "",
        "- Windows shorter than 12 minutes, longer than 3 hours, or with less than 0.4% SOC movement are rejected.",
        "- Power below the 20 W deadband is rejected because it creates unstable time estimates.",
        "- Effective capacity is observational and should be used as calibration support, not as a battery health verdict.",
        "",
    ])
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def format_number(value: float | int | None, unit: str) -> str:
    if value is None:
        return "unavailable"
    return f"{value:,.1f} {unit}"


def format_capacity(wh_per_percent: float | int | None) -> str:
    if wh_per_percent is None:
        return "unavailable"
    return f"{wh_per_percent * 100:,.0f} Wh ({wh_per_percent:,.1f} Wh/%)"


def main() -> None:
    parser = argparse.ArgumentParser(description="Backtest Bluetti runtime and charge estimate inputs against local SQLite history.")
    parser.add_argument("--db", default=os.environ.get("DB_PATH", str(DEFAULT_DB)))
    parser.add_argument("--device", default=None)
    parser.add_argument("--limit", type=int, default=20000)
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        raise SystemExit(f"Database not found: {db_path}")

    with sqlite3.connect(db_path) as conn:
        devices = fetch_devices(conn)
        if not devices:
            raise SystemExit("No devices found in telemetry database.")
        device = args.device or devices[0]
        field_map = {logical: choose_field(conn, device, aliases) for logical, aliases in FIELDS.items()}
        series = {
            logical: load_series(conn, device, field, args.limit)
            for logical, field in field_map.items()
        }
    rows = build_rows(series)
    windows = {
        "charging": find_windows(rows, "charging"),
        "discharging": find_windows(rows, "discharging"),
    }
    report = write_report(device, field_map, windows)
    print(f"Wrote {report}")


if __name__ == "__main__":
    main()
