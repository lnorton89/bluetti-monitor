# Phase 7: Fix Telemetry Trust States - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 07-fix-telemetry-trust-states
**Mode:** Auto (--auto flag)

---

## Gray Areas Discussed

### Loading State Design

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton placeholders | Content-preserving layout with pulse animation | ✓ |
| Spinner overlay | Centered spinner blocking content | |
| Inline loading text | "Loading..." text placeholder | |

**User's choice:** Skeleton placeholders (recommended default)
**Notes:** [auto] Selected: "Skeleton placeholders that preserve content layout during data fetch (recommended default)" — Skeleton screens maintain visual stability and reduce perceived wait time. React ecosystem standard approach.

### Stale Data Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Visual timestamp indicator | Color-coded based on data age | ✓ |
| Icon-only indicator | Simple warning icon without detail | |
| Dim content approach | Gray out content when stale | |

**User's choice:** Visual timestamp-based indicator with color coding (recommended default)
**Notes:** [auto] Selected: "Show visual timestamp-based indicator when data is older than threshold (recommended default)" — Color coding: fresh (normal) → aging (amber) → stale (red). Threshold: 30 seconds for "stale" warning, 60 seconds for "stale" indicator.

### Offline/Disconnected State

| Option | Description | Selected |
|--------|-------------|----------|
| Inline banner | Banner in content area | ✓ |
| Full overlay | Modal-style blocking overlay | |
| Shell-only indicator | Rely on top bar status only | |

**User's choice:** Inline banner in content area (recommended default)
**Notes:** [auto] Selected: "Show inline banner in the content area when WebSocket is disconnected (recommended default)" — Non-blocking but prominent enough to be noticed. Differentiate from loading state (never-connected vs disconnected after being connected).

### Partial/Missing Data Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Consistent "--" placeholder | Dimmed placeholder for null values | ✓ |
| Empty card approach | Hide cards with missing values | |
| Zero-as-empty | Treat 0 and missing the same | |

**User's choice:** Consistent "--" placeholder with dimmed styling (recommended default)
**Notes:** [auto] Selected: "Show consistent '--' placeholder with dimmed styling for null/missing values (recommended default)" — Zero values display as "0" or "0 W" (valid measurement). Missing values display as "--" with reduced opacity.

### Telemetry Summary Confidence

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit "estimated" label | Label + tooltip for derived values | ✓ |
| Tooltip only | Tooltip without label | |
| No indicator | Trust users understand estimates | |

**User's choice:** Explicit "estimated" label when battery runtime or charge time is calculated (recommended default)
**Notes:** [auto] Selected: "Add explicit 'estimated' label when battery runtime or charge time is calculated from fallback logic (recommended default)" — BatteryEstimates component should show when values are derived, not measured. Include tooltip explaining the estimate basis.

### State Consistency Across Pages

| Option | Description | Selected |
|--------|-------------|----------|
| Shared state hook | Centralized `useTelemetryState()` hook | ✓ |
| Page-level implementation | Each page handles state independently | |
| Provider pattern | React context for shared state | |

**User's choice:** Shared state hook (recommended default)
**Notes:** [auto] Selected: "Use a shared state hook or provider pattern to centralize loading/offline/stale state logic (recommended default)" — Create shared `useTelemetryState()` hook that wraps `useWsStore` with state classification. All pages consume from this hook for consistent behavior.

### Error Recovery

| Option | Description | Selected |
|--------|-------------|----------|
| Recoverable errors with retry | Error + retry action | ✓ |
| Silent retry | Automatic retry without UI | |
| Full error message | Detailed error display | |

**User's choice:** Recoverable error states with retry action (recommended default)
**Notes:** [auto] Selected: "Show recoverable error states with retry action rather than silent failures (recommended default)" — API fetch failures: show error with retry button. WebSocket disconnect: show reconnecting state with countdown.

---

## Claude's Discretion

The following implementation details were delegated to execution:
- Exact skeleton component styling (colors, animations)
- Specific stale threshold values (30s/60s) - can be tuned based on testing
- Tooltip styling for confidence indicators
- Animation preferences for state transitions

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Mode: Auto (--auto flag)*
*All decisions auto-selected based on recommended defaults*
