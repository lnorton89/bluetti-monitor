import gc
import os
import tempfile
import unittest
import warnings

import main


class AppSettingsTest(unittest.TestCase):
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

    def test_returns_an_empty_object_when_nothing_has_been_saved(self):
        self.assertEqual(main.db_load_app_settings(), {})

    def test_round_trips_saved_settings(self):
        settings = {"alerts": {"lowBatteryThresholdPercent": 33}}
        main.db_save_app_settings(settings)
        self.assertEqual(main.db_load_app_settings(), settings)

    def test_saving_again_overwrites_the_previous_value(self):
        main.db_save_app_settings({"alerts": {"lowBatteryThresholdPercent": 20}})
        main.db_save_app_settings({"alerts": {"lowBatteryThresholdPercent": 44}})
        self.assertEqual(
            main.db_load_app_settings(),
            {"alerts": {"lowBatteryThresholdPercent": 44}},
        )

    def test_ignores_a_corrupted_row(self):
        with main.db_connect() as conn:
            conn.execute(
                "INSERT INTO app_settings (id, value) VALUES (1, ?)",
                ("not valid json",),
            )
            conn.commit()

        self.assertEqual(main.db_load_app_settings(), {})


if __name__ == "__main__":
    unittest.main()
