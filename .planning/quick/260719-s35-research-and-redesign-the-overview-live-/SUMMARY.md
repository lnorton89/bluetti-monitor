---
status: complete
completed: "2026-07-20T03:35:00Z"
quick_id: 260719-s35
code_commit: b2cd17f
---

# Summary: Overview live power redesign

## Delivered

- Replaced the split copy/reserve/three-column snapshot with one source -> AC500 -> load power map and a visibly connected battery branch.
- Added a concise live balance equation, integrated battery reserve and contribution, direct source/load splits, and tooltip provenance for every calculation.
- Removed Overview's daily peak/history queries so the first useful live surface depends only on current WebSocket state.
- Removed duplicated device live/freshness chrome and simplified the shell to one alert status, conditional device count, and no duplicate Overview battery badge.
- Added responsive behavior for the 1500 x 960 Electrobun default and phone widths.
- Updated Playwright contracts for the new component and default-window geometry.

## Verification

- `npm --prefix dashboard run build` passed.
- Full dashboard Playwright suite passed: 9/9.
- Real AC500 `AC500-2237000003358` verified live at 1500 x 920 and 430 x 932 browser viewports.
- Desktop top bar remained a single 84 px row; route title was fully visible; the live map used five intentional grid columns; no horizontal overflow was observed.
- Browser console contained no warnings or errors during live verification.
- Supervisor log showed zero Overview history/stat requests after the redesigned page loaded.
- BLE polling remained active with `lastErrorAt: null`; API status reported fresh telemetry and `bluetooth_connected: ON`.

## Artifacts

- `.dev-data/ui-audit/live-power-redesign-desktop.png`
- `.dev-data/ui-audit/live-power-redesign-mobile.png`

