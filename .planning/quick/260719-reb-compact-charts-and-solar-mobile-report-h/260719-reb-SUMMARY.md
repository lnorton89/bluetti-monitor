---
quick_id: 260719-reb
status: complete
completed: 2026-07-20
---

# Compact Mobile Analytics Headers - Summary

Made the Charts and Solar phone headers substantially denser so the first useful report metric appears inside the initial viewport, without hiding controls or changing the desktop information architecture.

## Delivered

- Replaced long implementation-style report titles and summaries with shorter user-centered copy.
- Arranged the three coverage badges in one responsive mobile row.
- Kept all four time windows in one touch-safe row.
- Kept all four Charts focus controls and all three Solar focus controls in one row.
- Preserved 44px minimum tab targets, full-width device selection, and zero horizontal overflow.
- Scoped the compact grid rules to analytics hero cards below 480px.
- Added a focused Playwright regression test for header height, row alignment, touch target size, control counts, and overflow.

## Measured Result

| Measurement at 390x844 | Before | After | Change |
|---|---:|---:|---:|
| Charts header | 705px | 458px | 35% shorter |
| Solar header | 738px | 458px | 38% shorter |
| Metadata area | 152px | 44px | 71% shorter |
| Toolbar | 288px | 180px | 38% shorter |
| Charts full page | 4608px | 4362px | 246px shorter |
| Solar full page | 5351px | 5072px | 279px shorter |

All eight Charts buttons and all seven Solar buttons measured 44px high after the change. The first metric card is now visible in the initial 844px phone viewport on both routes.

## Verification

- `npm --prefix dashboard run build`: passed.
- `npm --prefix dashboard run test:e2e`: 9 passing tests.
- Live Playwright screenshots captured at 390x844 and 1440x1000 under `.dev-data/ui-audit/`.
- No horizontal overflow at either viewport.
- Real AC500 remained connected over Bluetooth and continued publishing fresh telemetry.
- Supervisor PID `11172` remained alive; no service restart was required.

## Commit

- `e03de81` - `feat(dashboard): compact mobile analytics headers`

## Scope Protection

The intentional submodule pointer difference and the unrelated v1.0.1 publish quick-task directory were preserved and not staged.
