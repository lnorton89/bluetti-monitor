# UI Research Summary

**Milestone:** v1.1 UI Cleanup And Reliability
**Date:** 2026-04-16

## What the codebase says

The dashboard is not failing because it lacks styling effort. It is failing because it has accumulated several partially overlapping UI systems:

- a strong but oversized global stylesheet
- inline-styled shared primitives
- page-specific control systems
- route-level hero and shell framing that compete with page content

The result matches the user feedback exactly: parts look polished, parts feel unfinished, and the whole experience reads as a jumbled mix of different design passes.

## Most important conclusions

### Stack additions

- None required for this milestone.
- The right move is to consolidate and simplify the existing React + CSS approach.

### Table stakes

- Navigation and shell coherence
- Trustworthy loading, offline, stale, and empty states
- Shared UI behavior across overview, charts, solar, and raw-data views
- Predictable responsive behavior on phone-sized screens

### Watch out for

- Mistaking visual flair for UI quality
- Deepening page-by-page divergence
- Showing confident telemetry summaries when the data freshness is weak

## Recommended milestone shape

This milestone should be framed around four workstreams:

1. Shared shell and design-system cleanup
2. Telemetry-state correctness and trust cues
3. Page-by-page UX repair for the most broken flows
4. Mobile and responsive consistency
