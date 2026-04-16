# Quick Task 260409-gpo Summary

## Outcome

Built a dedicated `/solar` workspace for the dashboard that focuses on live solar generation, PV1/PV2 input tracking, historical charts, and battery full-charge estimation based on real AC500 telemetry fields.

## What Changed

- Added a new Solar page and route to the dashboard shell.
- Added sidebar navigation for the solar workspace.
- Built solar-specific analytics for:
  - combined solar harvest
  - PV1 and PV2 power, voltage, and current
  - solar coverage versus live output
  - battery climb over the selected history window
  - time-to-full using `battery_range_to_full` when available, with a fallback derived from battery-percent trend and charge ceiling
- Added solar page styling that follows the visual system used by the overview and charts pages.
- Expanded dashboard mock telemetry so the solar page is useful in mock mode as well.

## Verification

- `npm --prefix dashboard run build`
  - Passed

## Notes

- The charge estimate intentionally stays tied to existing telemetry only. It prefers the device-reported full-charge field and only falls back to a recent battery-percent climb rate when the direct field is absent.
