import gc
import os
import tempfile
import unittest
import warnings

import main


class MetadataQueryTest(unittest.TestCase):
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

    def insert(self, device: str, field: str, value: str = "1"):
        with main.db_connect() as conn:
            conn.execute(
                "INSERT INTO readings (device, field, value, ts) VALUES (?, ?, ?, ?)",
                (device, field, value, "2026-07-19T00:00:00+00:00"),
            )
            conn.commit()

    def test_devices_are_unique_and_sorted(self):
        self.insert("AC500-B", "battery_percent")
        self.insert("AC500-A", "dc_input_power")
        self.insert("AC500-B", "dc_input_power")

        self.assertEqual(main.get_devices(), ["AC500-A", "AC500-B"])

    def test_fields_are_unique_sorted_and_scoped_to_device(self):
        self.insert("AC500-A", "dc_input_power")
        self.insert("AC500-A", "battery_percent")
        self.insert("AC500-A", "dc_input_power")
        self.insert("AC500-B", "ac_output_power")

        self.assertEqual(
            main.get_fields("AC500-A"),
            ["battery_percent", "dc_input_power"],
        )
        self.assertEqual(main.get_fields("missing"), [])


if __name__ == "__main__":
    unittest.main()
