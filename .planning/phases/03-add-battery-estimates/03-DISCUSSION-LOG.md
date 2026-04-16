# Phase 3: Add Battery Estimates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 03-add-battery-estimates
**Mode:** Auto (--auto flag)
**Areas discussed:** 8 gray areas

---

## Area: Calculation Location

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend (dashboard) | Client-side calculation using existing WebSocket data | ✓ |
| Backend (API) | Server-side calculation, expose as new endpoint | |
| Bridge (bluetti-mqtt-node) | Pre-compute before MQTT publish | |

**Auto-selection rationale:** Recommended option — simplest implementation, no API changes needed, leverages existing data flow.

---

## Area: Runtime Formula

| Option | Description | Selected |
|--------|-------------|----------|
| Capacity/Power ratio | (remaining_wh / output_w) * 60 | ✓ |
| Percentage-based | Estimate from percentage and historical rate | |
| Device-reported | Use battery_range_to_empty if available | |

**Auto-selection rationale:** Recommended option — direct calculation from available fields.

---

## Area: Charge Time Formula

| Option | Description | Selected |
|--------|-------------|----------|
| Capacity deficit ratio | ((capacity - remaining) / input_w) * 60 | ✓ |
| Time at current rate | Based on current charge current/voltage | |
| Device-reported | Use battery_range_to_full if available | |

**Auto-selection rationale:** Recommended option — mirrors discharge formula approach.

---

## Area: Display Format

| Option | Description | Selected |
|--------|-------------|----------|
| "Xh Ym" | Hours and minutes (e.g., "2h 30m") | ✓ |
| "HH:MM" | Colon-separated time | |
| Decimal hours | "2.5 hours" | |

**Auto-selection rationale:** Recommended option — most readable for quick scanning.

---

## Area: Insufficient Data Handling

| Option | Description | Selected |
|--------|-------------|----------|
| "—" | Em dash for unavailable estimates | ✓ |
| "Insufficient data" | Full text message | |
| Hide field | Don't show when unavailable | |

**Auto-selection rationale:** Recommended option — clear, compact, consistent with UI patterns.

---

## Area: Edge Case Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Zero power = "—" | Show em dash when power is 0W | ✓ |
| At 100% = "Full" | Explicit "Full" for charge time | |
| At 0% = "0m" | Show zero minutes remaining | |

**Auto-selection rationale:** Recommended option — handles most common edge cases gracefully.

---

## Area: Update Frequency

| Option | Description | Selected |
|--------|-------------|----------|
| Every telemetry tick | Same as live data updates | ✓ |
| Every 10 seconds | Fixed interval regardless of telemetry | |
| On demand | Calculate only when visible | |

**Auto-selection rationale:** Recommended option — real-time feel, no additional complexity.

---

## Area: Display Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Overview battery card | Primary battery status location | ✓ |
| Solar page | Relevant for charge estimates | |
| Sidebar | Quick-glance availability | |

**Auto-selection rationale:** Recommended option — logical primary location, can extend later.

---

## Auto Mode Summary

All 8 gray areas were auto-resolved using recommended defaults per --auto flag:
1. Calculation Location → Frontend (dashboard)
2. Runtime Formula → Capacity/Power ratio
3. Charge Time Formula → Capacity deficit ratio
4. Display Format → "Xh Ym"
5. Insufficient Data → "—"
6. Edge Cases → Zero power = "—"
7. Update Frequency → Every telemetry tick
8. Display Placement → Overview battery card

