---
status: complete
---

# Quick Task 260522-fcr: Isolate Field Comparison Renders

## Completed

- Extracted Field Comparison into a memoized `FieldComparisonPanel`.
- Moved `comparisonFields` and `fieldSearch` state into that panel.
- Moved comparison history loading into a dedicated `comparison-history-bundle` query.
- Reduced the top-level history query to resolved core analytics fields only.

## Verification

- `bun run build` in `analytics/` passed.
- Browser check clicked a Field Comparison chip and confirmed the Power Balance header stayed on its normal bucket subtitle instead of entering the top-level refreshing state.

