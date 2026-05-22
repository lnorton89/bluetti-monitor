---
status: complete
---

# Quick Task 260522-mvf: Make Mobile View More Friendly For Analytics

## Completed

- Adjusted the analytics mobile layout so the header, status pills, controls, KPI cards, panels, legends, comparison field picker, and snapshot cells fit more naturally on narrow screens.
- Reduced the dense chart minimum width from 320px to 260px so charts no longer force horizontal overflow inside phone-width panels.

## Verification

- Ran `npm run build` in `analytics/`; TypeScript and Vite completed successfully.
