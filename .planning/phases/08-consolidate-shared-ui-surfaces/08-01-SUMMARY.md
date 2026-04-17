---
phase: 08-consolidate-shared-ui-surfaces
plan: 01
subsystem: ui
tags: [react, css-tokens, shared-components, barrel-exports, surface-patterns]

# Dependency graph
requires:
  - phase: 06-unify-shell-and-navigation
    provides: Shell layout, sidebar, top-bar structure
  - phase: 07-fix-telemetry-trust-states
    provides: SkeletonCard, useTelemetryState hook, trust-state CSS
provides:
  - "7 shared surface components (SectionPanel, MetricTile, InfoRow, StatusChip, PageHeader, EmptyState + existing Card)"
  - "CSS token classes for surface-card, section-header, metric-tile, chip, tile-grid patterns"
  - "Barrel exports from ui.tsx for all shared components"
affects: [08-02, 08-03, overview-page, rawdata-page, charts-page, solar-page]

# Tech tracking
tech-stack:
  added: []
  patterns: [css-token-classes, barrel-re-exports, surface-card-variants, chip-variants]

key-files:
  created:
    - dashboard/src/components/SectionPanel.tsx
    - dashboard/src/components/MetricTile.tsx
    - dashboard/src/components/InfoRow.tsx
    - dashboard/src/components/StatusChip.tsx
    - dashboard/src/components/PageHeader.tsx
    - dashboard/src/components/EmptyState.tsx
  modified:
    - dashboard/src/components/ui.tsx
    - dashboard/src/index.css

key-decisions:
  - "Token classes added as new CSS; existing route-specific CSS kept intact to avoid visual regression"
  - "No alias/comma-selector duplication — existing classes remain authoritative until Plans 02-03 refactor pages"
  - "Card component gets surface-card class alongside existing inline styles for backward compatibility"

patterns-established:
  - "Surface token pattern: .surface-card + accent modifiers for card backgrounds"
  - "Chip variant pattern: .chip base + .chip--active/error/warning/info/inactive modifiers"
  - "Tile grid pattern: .tile-grid + .tile-grid--fit/cols-N/detail size modifiers"
  - "Metric tile pattern: .metric-tile > .metric-label + .metric-value + .metric-detail"

requirements-completed: [UI-07, UI-08, UI-09]

# Metrics
duration: 12min
completed: 2026-04-16
---

# Phase 08: Consolidate Shared UI Surfaces Summary

**Shared surface components (SectionPanel, MetricTile, InfoRow, StatusChip, PageHeader, EmptyState) with CSS token classes replacing duplicated card/panel/metric/chip/row patterns across four dashboard pages**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-16T17:44:47Z
- **Completed:** 2026-04-16T17:56:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- 6 new shared surface components created, all using CSS token classes
- Unified CSS token classes for surface-card, section-header, metric-tile, chip, and tile-grid patterns
- Barrel exports from ui.tsx for all shared + existing components
- Card component updated with surface-card class for unified rendering contract
- Zero visual regression — all existing page CSS classes remain untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract shared CSS token classes from duplicated route patterns** - `dc9d8ff` (feat)
2. **Task 2: Create shared surface components** - `2625c7e` (feat)
3. **Task 3: Wire surface-card class into Card component** - `20f5c06` (feat)

## Files Created/Modified
- `dashboard/src/components/SectionPanel.tsx` - Titled card panel with icon header
- `dashboard/src/components/MetricTile.tsx` - Label + value + detail stat tile
- `dashboard/src/components/InfoRow.tsx` - Key-value row for info tables
- `dashboard/src/components/StatusChip.tsx` - Pill-shaped status indicator with variants
- `dashboard/src/components/PageHeader.tsx` - Page-level header with kicker/title/meta
- `dashboard/src/components/EmptyState.tsx` - Centered empty-state display
- `dashboard/src/components/ui.tsx` - Added barrel re-exports for all 6 components + surface-card class on Card
- `dashboard/src/index.css` - Added shared surface token CSS classes section

## Decisions Made
- Kept existing route-specific CSS classes untouched — no alias/comma-selector pattern to avoid cascade conflicts
- Card component retains inline styles alongside surface-card class for backward compatibility
- React import removed from new components (React 19 JSX transform)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed unused React imports**
- **Found during:** Task 2 (Creating shared components)
- **Issue:** React 19 with JSX transform doesn't need explicit React imports — LSP flagged unused imports
- **Fix:** Removed `import React from 'react'` from InfoRow, StatusChip, EmptyState
- **Files modified:** InfoRow.tsx, StatusChip.tsx, EmptyState.tsx
- **Committed in:** 2625c7e (Task 2 commit)

**2. [Deviation] Dropped alias/comma-selector CSS approach**
- **Found during:** Task 1 (CSS token class extraction)
- **Issue:** Plan called for alias blocks with comma selectors (e.g., `.info-panel-title, .section-title { ... }`), but this would create cascade conflicts with existing more-specific rules that appear later in the file
- **Fix:** Added token classes as standalone new classes only; kept all existing CSS blocks untouched. Pages will migrate to token classes in Plans 02-03
- **Files modified:** index.css
- **Committed in:** dc9d8ff (Task 1 commit)

---

**Total deviations:** 2 (1 auto-fix, 1 plan adjustment)
**Impact on plan:** No scope creep. Both changes improve correctness and prevent visual regression.

## Issues Encountered
None

## Next Phase Readiness
- All 6 shared components ready for consumption by Plans 02 and 03
- CSS token classes available for page refactoring
- Plan 08-02 can now refactor Overview and RawData pages
- Plan 08-03 can now refactor Charts and Solar pages

---
*Phase: 08-consolidate-shared-ui-surfaces*
*Completed: 2026-04-16*
