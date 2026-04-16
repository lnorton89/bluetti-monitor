# UI Research: Pitfalls

**Milestone:** v1.1 UI Cleanup And Reliability
**Date:** 2026-04-16

## Main risks

### Visual polish without behavioral repair

- The repo already has evidence of multiple UI polish passes.
- If this milestone only adds new gradients, cards, or hero sections, the app will still feel unreliable.

### More page-specific divergence

- Charts and Solar are both sophisticated, but they solved similar layout problems separately.
- Continuing this pattern will make every future UI change slower and riskier.

### Hiding stale or missing telemetry

- The shell currently surfaces live summaries aggressively.
- If the dashboard does not distinguish fresh, stale, missing, and partial data clearly, users can over-trust the display.

### Mobile collapse by brute force

- The CSS already contains responsive overrides that flatten many desktop layouts at narrow widths.
- If future fixes rely only on more breakpoint overrides, mobile usability will stay fragile.

## Prevention strategy

- Require each page update to improve both correctness and hierarchy.
- Prefer shared component extraction over route-specific polish.
- Audit all loading, empty, offline, and stale states as first-class UX work.
- Use responsive simplification rather than stacking every desktop control on mobile.
