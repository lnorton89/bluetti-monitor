---
status: complete
---

# Quick Task 260522-twh: Match Time Window Control Height

## Completed

- Set `.segmented` height to 42px.
- Set `.icon-button` height to 42px to keep the control row aligned.
- Removed the shared min-height from segmented buttons so the outer segmented control defines the height.

## Verification

- `bun run build` in `analytics/` passed.
- Browser check confirmed device select, segmented time window, and refresh button all render at 42px height.

