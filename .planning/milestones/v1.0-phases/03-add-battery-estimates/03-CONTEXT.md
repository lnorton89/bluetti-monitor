# Phase 3: Add Battery Estimates - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn live telemetry into useful runtime and charging estimates inside the dashboard. This phase derives time-left metrics from AC500 fields that are actually available in live telemetry.

</domain>

<decisions>
## Implementation Decisions

### D-01: Calculate Estimates in Frontend
- **Decision:** Compute runtime and charge estimates client-side in the React dashboard
- **Rationale:** Real-time calculation without API changes, leverages existing WebSocket data flow, keeps bridge and API simple
- **Inputs needed:** remaining_capacity (Wh), battery_capacity (Wh), total_battery_percent (%), ac_output_power (W), ac_input_power (W), charging flags

### D-02: Runtime Formula
- **Decision:** Runtime (minutes) = (remaining_capacity_wh / ac_output_power_w) * 60
- **Rationale:** Simple, direct calculation from energy remaining and current discharge rate
- **Remaining capacity:** Use `remaining_capacity` field directly (already in Wh)
- **Buffer:** Account for 5% buffer below reported 0% (Bluetti holds ~5% reserve)

### D-03: Charge Time Formula
- **Decision:** Charge time (minutes) = ((battery_capacity - remaining_capacity) / ac_input_power) * 60
- **Rationale:** Time to fill remaining capacity at current charge rate
- **Charge detection:** Use `ac_charging_on` or `grid_charge_on` flags to determine charging state

### D-04: Display Format
- **Decision:** Show as "Xh Ym" format (e.g., "2h 30m") for readability
- **Rationale:** Human-readable, compact, consistent with personal monitoring use case
- **Rounding:** Round to nearest minute, show "–" for values < 1 minute

### D-05: Insufficient Data Handling
- **Decision:** Show "—" when estimate cannot be calculated
- **Conditions:** Zero power draw/charge, missing capacity fields, 0% or 100% battery, undefined values
- **Rationale:** Clear indication of unavailable data without breaking the display

### D-06: Edge Case Handling
- **Zero power:** Display "—" (infinite time) when power is 0W
- **At 0%:** Display "0m" or "—" depending on whether device is still responding
- **At 100%:** Display "Full" for charge time
- **Mixed input (solar + grid):** Use combined input power or prioritize grid for conservative estimate

### D-07: Update Strategy
- **Decision:** Update estimates on each telemetry update (same throttle as live data)
- **Rationale:** Real-time feel, no additional complexity
- **Throttle:** Respect existing 100ms throttle in ws.ts

### D-08: Display Placement
- **Decision:** Add to the Battery section/card on the Overview page
- **Rationale:** Primary battery status location, visible at a glance
- **Additional:** Consider adding to Solar page since charging estimates are relevant there

### Claude's Discretion
- Specific component placement within the Overview battery card
- Exact CSS/styling approach for the estimate display
- Handling of edge historical data scenarios (archive vs. live only)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, and key decisions including "Hardware-driven telemetry" constraint
- `.planning/REQUIREMENTS.md` — BATT-01, BATT-02, BATT-03 requirements for this phase

### Dashboard Code
- `dashboard/src/lib/fields.ts` — Field metadata including existing battery fields (total_battery_percent, remaining_capacity, battery_capacity, battery_range_to_empty, battery_range_to_full)
- `dashboard/src/store/ws.ts` — WebSocket state management for live telemetry
- `dashboard/src/pages/Overview.tsx` — Primary display location for battery status

### API/Bridge
- `api/main.py` — FastAPI status endpoint that exposes current telemetry
- `lib/bluetti-mqtt-node/src/app/device-handler.ts` — BLE polling and telemetry tracking (if additional fields needed)

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `fields.ts` getFieldMeta() and formatValue() utilities for consistent field display
- `ws.ts` useWsStore for live state access
- Existing battery fields already defined: total_battery_percent, remaining_capacity, battery_capacity, battery_range_to_empty, battery_range_to_full

### Established Patterns
- Dashboard uses Zustand store for state management
- Field values accessed via: state[device]?.field?.value pattern
- Numeric values parsed with parseFloat(), formatted with toLocaleString()

### Integration Points
- Estimates computed in React components using existing state
- New derived fields can be calculated on-the-fly during render
- No API or bridge changes required for frontend-only calculation

</codebase_context>

<specifics>
## Specific Ideas

- Use existing `battery_range_to_empty` and `battery_range_to_full` fields as reference (may be reported by device or need override)
- Match visual style of existing battery section on Overview page
- Consider adding confidence indicator if estimate has high variance

</specifics>

<deferred>
## Deferred Ideas

### Additional Display Locations
- Sidebar quick view — mentioned but defer to avoid scope creep
- Charts page historical estimates — future enhancement

### Advanced Calculations
- Solar-only charge estimation (separate from grid) — defer until solar input tracking is stable
- Temperature-adjusted estimates — defer (requires temp coefficient data)

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-add-battery-estimates*
*Context gathered: 2026-04-16*
