---
status: complete
---

# Quick Task 260614-ftq Summary

Removed the runtime/time-to-full estimate UI from the active dashboard:

- Removed the Overview `BatteryEstimates` render path.
- Deleted the now-unused `BatteryEstimates` component and estimate-only CSS.
- Removed Solar page battery-to-full metric, reported-full-time side stat, time-to-full chart series, charge estimate panel, field mappings, and estimate helper code.
- Updated Settings copy so battery capacity no longer claims to power runtime/charge-time estimates.
- Fixed Solar's empty-state hook ordering so the page can move from no-device to live-device state without a React hook-order error.

Added `Highest today` to Solar input cards:

- Fetches resolved solar input power history since local midnight.
- Displays the highest wattage for PV1, PV2, or the combined solar bus above the existing peak footer line.

Follow-up correction:

- Added `Highest today` to the Overview hero input card as well, directly above the `Generated ... kWh` line.
- The Overview value uses today's `dc_input_power + ac_input_power` history and includes the current live input as a fallback/latest candidate.

Verification:

- `bun run build` passed in `dashboard/`.
- Active dashboard UI search found no stale estimate component/time-to-full references.
- In-app browser smoke check confirmed Solar renders `Highest today` in the input cards and no removed estimate language remains in the visible DOM.
- In-app browser smoke check confirmed Overview renders `Highest today` above `Generated`.

Note:

- Existing uncommitted changes in `dashboard/src/lib/battery-estimates.ts`, `dashboard/test-unit/battery-estimates.test.ts`, and `.planning/debug/battery-runtime-estimate-wrong.md` were present before this task and were left untouched.
