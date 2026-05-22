# Quick Task 260522-fcr: Isolate Field Comparison Renders

## Goal

Stop Field Comparison field selection from re-rendering and refreshing the whole analytics page.

## Tasks

1. Move Field Comparison search and selected-field state out of `App`.
2. Give Field Comparison its own history query instead of sharing the top-level history bundle.
3. Keep top-level analytics history scoped to resolved core metrics.
4. Verify build and browser behavior.

