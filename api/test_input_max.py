import importlib
import gc
import os
import tempfile
import unittest
import warnings


class InputMaxStatsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(delete=False)
        self.tmp.close()
        os.environ["DB_PATH"] = self.tmp.name

        global main
        main = importlib.import_module("main")
        main.DB_PATH = self.tmp.name
        main.db_init()

    def tearDown(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", ResourceWarning)
            gc.collect()
        os.unlink(self.tmp.name)

    def insert(self, field: str, value: float, ts: str):
        with main.db_connect() as conn:
            conn.execute(
                "INSERT INTO readings (device, field, value, ts) VALUES (?, ?, ?, ?)",
                ("AC500", field, str(value), ts),
            )
            conn.commit()

    def test_input_max_uses_bounded_daylight_window_with_baseline_state(self):
        self.insert("ac_input_power", 50, "2026-06-16T05:59:00.000000+00:00")
        self.insert("dc_input_1_power", 300, "2026-06-16T05:59:00.000000+00:00")
        self.insert("dc_input_2_power", 200, "2026-06-16T05:59:00.000000+00:00")
        self.insert("dc_input_1_power", 350, "2026-06-16T06:30:00.000000+00:00")
        self.insert("dc_input_2_power", 220, "2026-06-16T12:00:00.000000+00:00")
        self.insert("dc_input_1_power", 1000, "2026-06-16T18:15:00.000000+00:00")

        result = main.get_input_max(
            "AC500",
            since="2026-06-16T06:00:00.000000+00:00",
            until="2026-06-16T18:00:00.000000+00:00",
        )

        self.assertEqual(result, {"value": 570.0})

    def test_input_max_does_not_count_pre_window_baseline_as_peak(self):
        self.insert("dc_input_1_power", 1800, "2026-06-16T05:59:00.000000+00:00")
        self.insert("dc_input_2_power", 200, "2026-06-16T05:59:00.000000+00:00")
        self.insert("dc_input_1_power", 300, "2026-06-16T06:01:00.000000+00:00")
        self.insert("dc_input_2_power", 250, "2026-06-16T06:02:00.000000+00:00")

        result = main.get_input_max(
            "AC500",
            since="2026-06-16T06:00:00.000000+00:00",
            until="2026-06-16T18:00:00.000000+00:00",
        )

        self.assertEqual(result, {"value": 550.0})

    def test_input_max_ignores_ac_input(self):
        self.insert("ac_input_power", 2000, "2026-06-16T06:15:00.000000+00:00")
        self.insert("grid_charge_power", 1800, "2026-06-16T06:30:00.000000+00:00")
        self.insert("dc_input_1_power", 320, "2026-06-16T06:45:00.000000+00:00")
        self.insert("dc_input_2_power", 280, "2026-06-16T07:00:00.000000+00:00")

        result = main.get_input_max(
            "AC500",
            since="2026-06-16T06:00:00.000000+00:00",
            until="2026-06-16T18:00:00.000000+00:00",
        )

        self.assertEqual(result, {"value": 600.0})

    def test_input_max_prefers_aggregate_solar_when_split_fields_are_stale(self):
        self.insert("dc_input_power", 500, "2026-06-16T06:00:30.000000+00:00")
        self.insert("dc_input_1_power", 900, "2026-06-16T06:01:00.000000+00:00")
        self.insert("dc_input_2_power", 800, "2026-06-16T06:01:01.000000+00:00")
        self.insert("dc_input_power", 650, "2026-06-16T07:00:00.000000+00:00")

        result = main.get_input_max(
            "AC500",
            since="2026-06-16T06:00:00.000000+00:00",
            until="2026-06-16T18:00:00.000000+00:00",
        )

        self.assertEqual(result, {"value": 650.0})


if __name__ == "__main__":
    unittest.main()
