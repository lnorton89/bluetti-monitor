---
status: complete
---

# Quick Task 260522-fcf: Filter Comparison Fields

## Completed

- Added `EXCLUDED_COMPARISON_FIELDS` for fields such as `arm_version`, `dsp_version`, `serial_number`, `device_type`, `pack_num`, `pack_num_max`, `_raw`, and status/config fields.
- Filtered Field Comparison choices through `isComparableField`.
- Kept useful telemetry fields such as battery voltage and internal AC voltage available.

## Verification

- `bun run build` in `analytics/` passed.
- Browser check confirmed forbidden labels like ARM Version, DSP Version, Serial Number, Device Type, Pack Count, and Max Packs were absent from the picker while useful telemetry fields remained.

