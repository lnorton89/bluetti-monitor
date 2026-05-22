---
status: complete
---

# Quick Task 260522-dfc: Default Field Comparison Selection

## Completed

- Updated `DEFAULT_COMPARISON_FIELDS` to:
  - `ac_input_power`
  - `ac_output_power`
  - `dc_input_power`
  - `dc_output_power`
  - `total_battery_percent`
  - `power_generation`
- Fixed Field Comparison selection initialization so defaults repopulate after numeric fields load.

## Verification

- `bun run build` in `analytics/` passed.
- Browser check against built preview confirmed legend order: AC Input Power, AC Output Power, DC Input Power, DC Output Power, Battery Level, Generated Energy.

