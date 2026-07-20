import gc
import os
import tempfile
import unittest
import warnings

import main


class LatestSnapshotTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(delete=False)
        self.tmp.close()
        self.original_db_path = main.DB_PATH
        main.DB_PATH = self.tmp.name
        main.db_init()

    def tearDown(self):
        main.DB_PATH = self.original_db_path
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", ResourceWarning)
            gc.collect()
        os.unlink(self.tmp.name)

    def insert(self, device: str, field: str, value: str, ts: str):
        with main.db_connect() as conn:
            conn.execute(
                "INSERT INTO readings (device, field, value, ts) VALUES (?, ?, ?, ?)",
                (device, field, value, ts),
            )
            conn.commit()

    def test_loads_only_the_newest_value_for_each_device_field(self):
        self.insert("AC500-A", "battery_percent", "60", "2026-07-19T01:00:00+00:00")
        self.insert("AC500-A", "battery_percent", "61", "2026-07-19T02:00:00+00:00")
        self.insert("AC500-A", "ac_output_power", "470", "2026-07-19T02:01:00+00:00")
        self.insert("AC500-B", "battery_percent", "80", "2026-07-19T02:02:00+00:00")
        # Timestamp order, rather than insertion order, defines the restored snapshot.
        self.insert("AC500-A", "battery_percent", "stale", "2026-07-19T00:30:00+00:00")

        self.assertEqual(
            main.db_load_latest(),
            {
                "AC500-A": {
                    "battery_percent": {
                        "value": "61",
                        "ts": "2026-07-19T02:00:00+00:00",
                    },
                    "ac_output_power": {
                        "value": "470",
                        "ts": "2026-07-19T02:01:00+00:00",
                    },
                },
                "AC500-B": {
                    "battery_percent": {
                        "value": "80",
                        "ts": "2026-07-19T02:02:00+00:00",
                    },
                },
            },
        )


if __name__ == "__main__":
    unittest.main()
