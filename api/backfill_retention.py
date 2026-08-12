"""
One-time migration to apply the retention policy to an existing database:
purges retired fields (_raw), rolls the historical backlog older than
RAW_RETENTION_DAYS into readings_hourly aggregates, drops aggregates older
than AGGREGATE_RETENTION_DAYS, then VACUUMs to reclaim disk space.

Safe to re-run — everything after the purge is idempotent (rollup batches
merge into existing aggregates, pruning re-deletes nothing once caught up).
Ongoing retention after this point is handled automatically by the API's
background retention_loop; this script only exists to work through the
backlog that predates that loop.

Usage (from the api/ directory, same venv as the API):
    python backfill_retention.py

VACUUM briefly holds an exclusive lock on the database and needs free disk
space roughly equal to the current DB size — stop the API container first if
running this against a live production DB.
"""
import os
import time
from datetime import datetime, timedelta, timezone

import main

BATCH_LIMIT = main.RETENTION_BATCH_LIMIT


def purge_retired_fields(fields: tuple[str, ...]) -> int:
    if not fields:
        return 0
    with main.db_connect() as conn:
        placeholders = ",".join("?" for _ in fields)
        cur = conn.execute(f"DELETE FROM readings WHERE field IN ({placeholders})", fields)
        conn.commit()
        return cur.rowcount


def run() -> None:
    main.db_init()

    size_before = os.path.getsize(main.DB_PATH)
    print(f"DB size before: {size_before / 1e9:.2f} GB")

    purged = purge_retired_fields(main.RETIRED_FIELDS)
    print(f"Purged {purged} rows for retired fields {main.RETIRED_FIELDS}")

    raw_cutoff = (datetime.now(timezone.utc) - timedelta(days=main.RAW_RETENTION_DAYS)).isoformat()
    total_rolled = 0
    start = time.perf_counter()
    while True:
        rolled = main.db_rollup_older_than(raw_cutoff, BATCH_LIMIT)
        total_rolled += rolled
        if rolled:
            print(f"  rolled up {total_rolled} rows so far...")
        if rolled < BATCH_LIMIT:
            break
    print(f"Rolled up {total_rolled} raw rows older than {raw_cutoff} in {time.perf_counter() - start:.1f}s")

    agg_cutoff = (datetime.now(timezone.utc) - timedelta(days=main.AGGREGATE_RETENTION_DAYS)).isoformat()
    pruned = main.db_prune_aggregates_older_than(agg_cutoff)
    print(f"Pruned {pruned} hourly aggregates older than {agg_cutoff}")

    print("Running VACUUM to reclaim disk space (holds an exclusive lock)...")
    with main.db_connect() as conn:
        conn.execute("VACUUM")

    size_after = os.path.getsize(main.DB_PATH)
    print(
        f"DB size after: {size_after / 1e9:.2f} GB "
        f"(freed {(size_before - size_after) / 1e9:.2f} GB)"
    )


if __name__ == "__main__":
    run()
