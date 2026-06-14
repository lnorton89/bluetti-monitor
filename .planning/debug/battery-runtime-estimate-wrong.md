---
status: investigating
trigger: "/gsd-debug battery runtime estimate is clearly wrong; screenshot shows 57% battery, -168 W net balance, and 20h 51m runtime"
created: 2026-06-07
updated: 2026-06-07
---

# Debug Session: battery-runtime-estimate-wrong

## Symptoms

- Expected behavior: runtime should be a transparent, plausible estimate derived from AC500 live telemetry.
- Actual behavior: dashboard shows 20h 51m runtime at 57% battery and -168 W net balance, which looks wildly over-optimistic.
- Error messages: none reported.
- Timeline: repeated prior attempts made the estimate more complex and less trustworthy.
- Reproduction: open the dashboard live snapshot while the AC500 is supplying load.

## Current Focus

- hypothesis: runtime estimate is using an inflated or ambiguous capacity source and then hiding the capacity assumption in the compact UI.
- test: trace buildBatteryEstimate and the live state fields used for the screenshot scenario.
- expecting: 20h 51m comes from roughly 3500 Wh remaining at 168 W, implying about 6144 Wh full capacity at 57%.
- next_action: inspect estimate candidate ordering, capacity source selection, and tests before simplifying the runtime path.

## Evidence

## Eliminated

## Resolution

- root_cause:
- fix:
- verification:
- files_changed:
