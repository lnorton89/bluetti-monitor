# UI Research: Architecture Findings

**Milestone:** v1.1 UI Cleanup And Reliability
**Date:** 2026-04-16

## Current UI architecture issues

### 1. Too many presentation systems at once

- `dashboard/src/index.css` contains the majority of the visual language, but key primitives in `dashboard/src/components/ui.tsx` still hardcode layout and spacing inline.
- `Overview.tsx`, `Charts.tsx`, `Solar.tsx`, and `RawData.tsx` each define their own flavor of cards, scoreboards, control bars, and emphasis patterns.
- Result: the dashboard feels assembled from several iterations instead of one coherent product surface.

### 2. Global CSS is doing too much

- `dashboard/src/index.css` is very large and mixes:
  - global tokens
  - shell layout
  - page-specific sections
  - responsive overrides
  - compatibility hacks
- This makes it hard to reason about whether a UI issue is caused by tokens, shared components, or page-specific styling.

### 3. Route pages carry too much presentation detail

- `Charts.tsx` and `Solar.tsx` are especially heavy with presentation-specific control markup and repeated style constants.
- Shared concepts like scorecards, insight cards, segmented controls, and workspace panels exist, but not as stable reusable building blocks.

## Recommended architecture direction

- Keep the current route structure.
- Establish a tighter shared UI surface layer for:
  - workspace headers
  - scorecards
  - state panels
  - segmented controls
  - search and filter controls
  - table and list shells
- Reduce inline styling in `ui.tsx`, `Overview.tsx`, `Charts.tsx`, `Solar.tsx`, `RawData.tsx`, and `Sidebar.tsx`.
- Split CSS ownership more intentionally by cleaning up shared shell/component sections before doing further page polish.

## Suggested build order

1. Normalize shell and shared primitives
2. Fix cross-route state handling and telemetry trust cues
3. Rebuild highest-friction pages around the shared patterns
4. Finish responsive cleanup and edge-state verification
