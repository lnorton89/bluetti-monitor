# Phase 7: Fix Telemetry Trust States - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

**Goal:** Repair how the dashboard communicates loading, offline, stale, missing, and partial telemetry so users can trust what they are seeing.

**Requirements addressed:**
- UI-04: User can distinguish loading, empty, offline, stale, and partially available telemetry states across the dashboard
- UI-05: User sees live telemetry summaries that behave correctly when values are missing, delayed, or derived from fallback logic
- UI-06: User can trust that the overview, charts, solar, and raw-data pages present state in a consistent and understandable way

**Scope:** All dashboard pages (Overview, Charts, Solar, RawData), WebSocket connection states, and telemetry summary components.

</domain>

<decisions>
## Implementation Decisions

### Loading State Design
- **D-01:** Use skeleton placeholders that preserve content layout during data fetch (recommended default)
  - Skeleton screens maintain visual stability and reduce perceived wait time
  - React ecosystem standard approach
- **Rationale:** The app currently lacks consistent loading states across pages. Charts page uses React Query but doesn't show loading UI. Overview shows empty state only when devices array is empty.

### Stale Data Indicator
- **D-02:** Show visual timestamp-based indicator when data is older than threshold (recommended default)
  - Color coding: fresh (normal) → aging (amber) → stale (red)
  - Threshold: 30 seconds for "stale" warning, 60 seconds for "stale" indicator
- **Rationale:** `lastUpdate` is already tracked in `ws.ts` and shown in App.tsx. App.tsx shows `formatRelativeTime(lastUpdate)` in the header. Pages should show explicit stale indicators when data is old.

### Offline/Disconnected State
- **D-03:** Show inline banner in the content area when WebSocket is disconnected (recommended default)
  - Non-blocking but prominent enough to be noticed
  - Differentiate from loading state (never-connected vs disconnected after being connected)
- **Rationale:** App.tsx already shows "Live" vs "Offline" in the top bar. Pages should show their own offline indicators rather than relying solely on the shell.

### Partial/Missing Data Handling
- **D-04:** Show consistent "--" placeholder with dimmed styling for null/missing values (recommended default)
  - Zero values display as "0" or "0 W" (valid measurement)
  - Missing values display as "--" with reduced opacity
- **Rationale:** Already established in Overview.tsx with `getNumber()` returning null for missing fields. This pattern should be consistent across all pages.

### Telemetry Summary Confidence
- **D-05:** Add explicit "estimated" label when battery runtime or charge time is calculated from fallback logic (recommended default)
  - BatteryEstimates component should show when values are derived, not measured
  - Include tooltip explaining the estimate basis
- **Rationale:** BatteryEstimates component shows runtime remaining but doesn't indicate confidence level. Users need to know when they're looking at an estimate.

### State Consistency Across Pages
- **D-06:** Use a shared state hook or provider pattern to centralize loading/offline/stale state logic (recommended default)
  - Create shared `useTelemetryState()` hook that wraps `useWsStore` with state classification
  - All pages consume from this hook for consistent behavior
- **Rationale:** Phase 8 will consolidate shared UI surfaces. State handling patterns should be established now to avoid rework.

### Error Recovery
- **D-07:** Show recoverable error states with retry action rather than silent failures (recommended default)
  - API fetch failures: show error with retry button
  - WebSocket disconnect: show reconnecting state with countdown
- **Rationale:** App.tsx already has reconnection logic (3-second timer). UI should reflect the reconnecting state.

### Claude's Discretion
The following decisions are delegated to implementation:
- Exact skeleton component styling (colors, animations)
- Specific stale threshold values (30s/60s) - can be tuned based on testing
- Tooltip styling for confidence indicators
- Animation preferences for state transitions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dashboard Architecture
- `dashboard/src/store/ws.ts` — WebSocket state management (connected, lastUpdate, state)
- `dashboard/src/App.tsx` — Shell-level connection status display
- `dashboard/src/pages/Overview.tsx` — Existing empty state and null value handling patterns

### Existing State Patterns
- `dashboard/src/lib/api.ts` — API client with mock mode support
- `dashboard/src/components/ui.tsx` — Shared UI components (Card, etc.)

### Related Components
- `dashboard/src/components/BatteryEstimates.tsx` — Battery runtime/chargetime estimates (needs confidence indicator)

### Styling
- `dashboard/src/index.css` — Global styles, CSS variables

### Fields and Data
- `dashboard/src/lib/fields.ts` — Field metadata and definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useWsStore()` — Already tracks `connected`, `lastUpdate`, and `state` (device → field → value/ts)
- `formatRelativeTime()` — Existing utility for displaying time differences
- `Card` component — Base container for content sections
- Existing null handling patterns in Overview.tsx with `getNumber()`, `getText()`, `getBool()` helpers

### Established Patterns
- Empty state: Overview shows inline empty state card with instructions
- Connection status: App.tsx shows "Live" vs "Offline" badge
- Time display: Relative time format in shell
- Value placeholders: `--` for missing values, `0` for zero measurements

### Integration Points
- Pages consume from `useWsStore()` directly
- Shell shows connection status from `useWsStore()`
- React Query for API calls (Charts page)

### Gaps Identified
- No shared hook for state classification (loading, stale, offline)
- No skeleton loading UI
- BatteryEstimates lacks confidence indicator
- Pages don't show stale data indicators

</code_context>

<specifics>
## Specific Ideas

### State Classification Hook
Create `useTelemetryState()` hook that:
- Classifies current state: loading | connected | stale | offline | partial
- Provides derived boolean flags and state labels
- Handles both initial load and reconnection states

### Shared Skeleton Component
Create `SkeletonCard` component that:
- Matches Card dimensions for layout stability
- Subtle pulse animation
- Configurable content placeholder patterns

### Stale Data Indicator
Add to pages or create `StaleIndicator` component:
- Shows when `Date.now() - lastUpdate > THRESHOLD`
- Color-coded severity (fresh → aging → stale)
- Click to refresh option

### BatteryEstimates Confidence
Enhance BatteryEstimates component:
- Show "estimated" label when using fallback calculation
- Tooltip explaining estimate basis
- Visual distinction from direct measurements

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
None — no relevant pending todos found for this phase scope.

</deferred>

---

*Phase: 07-fix-telemetry-trust-states*
*Context gathered: 2026-04-16*
