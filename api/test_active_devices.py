import unittest
from datetime import datetime, timedelta, timezone

import main


class ActiveDevicesTest(unittest.TestCase):
    @staticmethod
    def snapshot(ac500_a_age_s: float, sim_age_s: float) -> dict:
        now = datetime.now(timezone.utc)
        return {
            "AC500-2237000003358": {
                "total_battery_percent": {
                    "value": "80",
                    "ts": (now - timedelta(seconds=ac500_a_age_s)).isoformat(),
                },
            },
            "AC500-2401234567890": {
                "total_battery_percent": {
                    "value": "50",
                    "ts": (now - timedelta(seconds=sim_age_s)).isoformat(),
                },
            },
        }

    def test_drops_device_that_has_gone_silent(self):
        # Live device reporting seconds ago, simulated device last seen 3h ago.
        snap = self.snapshot(ac500_a_age_s=5, sim_age_s=3 * 3600)
        result = main.active_devices(snap, window_seconds=900)
        self.assertEqual(list(result.keys()), ["AC500-2237000003358"])

    def test_keeps_all_devices_within_window(self):
        snap = self.snapshot(ac500_a_age_s=5, sim_age_s=60)
        result = main.active_devices(snap, window_seconds=900)
        self.assertEqual(set(result.keys()), {"AC500-2237000003358", "AC500-2401234567890"})

    def test_zero_window_disables_filtering(self):
        snap = self.snapshot(ac500_a_age_s=5, sim_age_s=10 * 3600)
        self.assertEqual(main.active_devices(snap, window_seconds=0), snap)

    def test_device_with_unparseable_timestamps_is_dropped(self):
        snap = {"AC500-BAD": {"f": {"value": "1", "ts": "not-a-timestamp"}}}
        self.assertEqual(main.active_devices(snap, window_seconds=900), {})


if __name__ == "__main__":
    unittest.main()
