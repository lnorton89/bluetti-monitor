# UI Research: Feature Findings

**Milestone:** v1.1 UI Cleanup And Reliability
**Date:** 2026-04-16

## Table stakes for this milestone

### Navigation and shell coherence

- The app shell should orient the user consistently across every route.
- Sidebar, top bar, and route hero should agree on page identity and not compete for attention.
- Mobile navigation should feel deliberate rather than like a desktop layout squeezed smaller.

### View correctness and trust

- Empty, loading, offline, stale, and partial-data states should be clearly differentiated.
- Live telemetry summaries should not imply confidence when the data is missing, stale, or derived from weak assumptions.
- The dashboard should avoid showing decorative metrics that distract from the real current device state.

### Shared interaction patterns

- Device selection, time-range controls, chips, cards, status pills, and table surfaces should behave and look like one system.
- Pages should share consistent spacing, typography, and density rules.
- Inline one-off styling should not be the normal way new UI gets added.

### Responsive reliability

- Overview, charts, solar, and raw-data views should all remain usable on phone-sized screens.
- Tables, segmented controls, and scorecard grids need consistent collapse behavior.
- Page layouts should reduce complexity on narrow screens instead of stacking every desktop affordance.

## Differentiators worth keeping

- Monitoring-console tone and typography
- Strong live telemetry framing
- Dedicated solar workspace
- Data transparency via raw field explorer

## Anti-features for this milestone

- More decorative chrome without fixing underlying behavior
- More analytics widgets without a tighter information hierarchy
- Route-specific bespoke components that deepen the design drift
