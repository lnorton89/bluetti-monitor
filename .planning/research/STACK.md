# UI Research: Stack Notes

**Milestone:** v1.1 UI Cleanup And Reliability
**Date:** 2026-04-16

## Existing stack reality

- React 19 with route-level pages in `dashboard/src/pages/`
- Shared state through `@tanstack/react-query` and `dashboard/src/store/ws.ts`
- Visual system concentrated in one large stylesheet: `dashboard/src/index.css`
- Shared presentational primitives in `dashboard/src/components/ui.tsx`
- Desktop shell framing in `dashboard/src/App.tsx` and `dashboard/src/components/Sidebar.tsx`

## Findings

- The current stack is already capable of a strong UI refresh without any framework migration.
- The biggest UI risk is not missing libraries; it is inconsistent use of the current ones.
- Styling is split between:
  - large global CSS
  - inline style objects in components
  - component-specific ad hoc accents and sizing
- Several views implement their own local control bars, scorecards, and layout rules instead of reusing a tighter dashboard surface system.

## Recommended approach

- Keep the current React, React Query, and global CSS stack for this milestone.
- Invest in a small shared UI layer inside the existing dashboard rather than adding a new design system package.
- Move repeated control, card, status, and metric patterns out of inline style objects and into named classes or shared components.
- Treat visual cleanup and behavioral correctness as one track so page polish does not hide stale, empty, or incorrect states.

## What not to add

- No UI framework migration
- No CSS-in-JS introduction
- No broad token rewrite beyond what is needed to normalize existing styles
- No new dashboard pages until current views are coherent and trustworthy
