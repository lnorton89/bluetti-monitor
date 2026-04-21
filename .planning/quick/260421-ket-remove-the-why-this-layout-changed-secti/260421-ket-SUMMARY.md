# Quick Task 260421-ket Summary

## Outcome

Removed the obsolete "Why This Layout Changed" panel from the overview page and fixed the switchboard badge logic so boolean-like telemetry values render correctly.

## Root Cause

The switchboard section was feeding raw telemetry strings into `BoolBadge`, but `BoolBadge` only treated `True`, `true`, and `1` as truthy. Devices that publish `ON` therefore showed up as OFF in the switchboard even when the state was active.

## Changes

- Removed the overview explainer panel from `dashboard/src/pages/Overview.tsx`
- Updated `dashboard/src/components/ui.tsx` so `BoolBadge` normalizes string values and correctly treats `on`/`ON` as enabled

## Verification

- `bun run build` in `dashboard/`

## Notes

- The production build still reports the pre-existing Vite chunk-size warning for the main bundle.
