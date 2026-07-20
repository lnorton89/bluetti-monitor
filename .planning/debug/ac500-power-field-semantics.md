---
status: resolved
trigger: "Verify Claude's AC500 data-consistency and dashboard improvement claims, then implement the accurate improvements"
created: 2026-07-20
updated: 2026-07-20
---

# AC500 power field semantics and dashboard clarity

## Symptoms

- Expected: every power value should be labeled according to its actual BLE/register meaning, and the live snapshot should make the input/load/battery relationship understandable without implying unsupported estimates.
- Actual: `internal_power_one` and `internal_power_two` were presented as generic Internal Channels beside system input/output figures even though their sum does not reconcile with AC output. Battery contribution was only implied by a negative net balance. Some solar, pack, alert, and freshness labels lacked context.
- Errors: no device/runtime exception; this was a semantic-labeling defect plus a set of proposed UX improvements.
- Timeline: identified from the live Overview after the responsive UI cleanup.
- Reproduction: compare `/status` values for AC output, DC/AC input, internal powers/currents, battery current/voltage, pack selection, and timestamps; trace each field through the workspace submodule register definitions and dashboard calculations.

## Current Focus

- hypothesis: confirmed. The internal fields are separate AC-side sensor registers. The available reverse-engineered protocol does not document enough semantics to call them phases or packs, but it does establish that they are not battery-pack telemetry and are not the aggregate AC output register.
- test: traced the AC500 register definitions, sampled the physical AC500 repeatedly, checked the dashboard's pack, notification, freshness, and estimate code, then verified the updated UI at desktop and phone sizes.
- expecting: each nonzero internal power should roughly track its paired current multiplied by the roughly 120 V internal AC reading, while the independently reported AC output and input/output balance remain coherent.
- next_action: none for this defect. Keep the raw sensor channels diagnostic until stronger protocol documentation or controlled electrical tests establish their exact physical placement.

## Evidence

- The AC500 register map stores total DC input, AC input, AC output, and DC output at registers 36-39, while registers 71-80 are a separate sequence of internal AC voltage, three current/power sensors, and frequencies.
- One live sample reported 120.4 V, 4.5 A / 532 W and 4.5 A / 546 W on sensors 1 and 2, plus 539 W AC output. Each sensor power is near voltage multiplied by its paired current; summing the two sensor powers is therefore not an AC-output reconciliation.
- Six live samples showed a load-side battery deficit between 434 W and 515 W. The battery bus concurrently reported 51.8 V and 11 A, or about 570 VA, which independently supports the discharge interpretation while allowing for update timing, conversion losses, and register rounding.
- `pack_num_max` is a supported-address limit of six and `pack_num` is used by the bridge as a polling selector. Neither field establishes that six physical packs are connected, so the Overview's Selected Pack card was misleading.
- AC500 `dc_input_1_voltage` and `dc_input_2_voltage` are the two PV/DC input registers used by the Solar page's PV1/PV2 aliases, so MPPT context is appropriate.
- The only interactive alert threshold in the current dashboard is battery-full at `battery_range_end`; there are no low-SOC, high-draw, or input-loss thresholds to expose.
- Runtime and time-to-full UI was deliberately removed in quick task `260614-ftq`; the underlying estimator remains for diagnostics/tests but should not be resurfaced as a simplistic SOC-times-capacity calculation.
- The shell already uses the WebSocket `lastUpdate` timestamp for both exact and relative freshness and already surfaces aging/stale state. The ambiguity was labeling, not two clock sources.

## Eliminated

- Scaling/unit bug: the current and power pairs are internally coherent at approximately 120 V, and the parser scales the AC500 values according to the inherited register definitions.
- Pack-discharge interpretation: the pack registers live in a separate battery/pack range and are selected through `pack_num`; the internal powers are adjacent to internal AC voltage/current/frequency.
- Missing alert-threshold panel: unsupported because only battery-full notifications exist today. The header now names that actual trigger and its charge ceiling instead.
- Immediate per-card sparklines: Charts and Solar already provide historical context, while adding several Overview history queries would work against the current time-to-useful-data goal.

## Resolution

- root_cause: generic UI labels placed reverse-engineered diagnostic AC sensor channels beside aggregate system power, inviting an invalid sum; the live flow also left battery contribution implicit, and pack/PV/alert/freshness labels lacked enough context.
- fix: relabeled internal registers as independent AC sensor channels with a caution, added an explicit battery balance node, removed the polling-selector pack card, named PV1/PV2 MPPT values, made zero-power statuses visually neutral, identified the real battery-full notification ceiling, and clarified exact versus relative telemetry freshness.
- verification: `npm --prefix dashboard run build`; six focused Playwright E2E tests; live in-app Playwright desktop/mobile review against `http://127.0.0.1:5400/`; saved screenshots in `.dev-data/ui-audit/`; no browser console errors; live supervisor continued polling the physical AC500.
- files_changed: `dashboard/src/pages/Overview.tsx`, `dashboard/src/App.tsx`, `dashboard/src/components/Sidebar.tsx`, `dashboard/src/index.css`, `dashboard/src/lib/fields.ts`, `dashboard/src/lib/mock.ts`, `dashboard/tests/dashboard.spec.ts`.
