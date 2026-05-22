# Quick Task 260522-mvf: Make Mobile View More Friendly For Analytics

## Goal

Improve the standalone analytics app on phone-sized screens without changing desktop behavior.

## Tasks

1. Tune analytics responsive layout
   - Files: `analytics/src/index.css`
   - Action: Make mobile controls, panels, charts, field chips, legends, and snapshot/KPI cards easier to scan and less likely to overflow.
   - Verify: Build the analytics app and inspect the changed styles.

2. Let dense charts fit narrow panels
   - Files: `analytics/src/components/DenseTimeSeries.tsx`
   - Action: Reduce the enforced chart minimum width so 320px phone layouts do not create horizontal overflow.
   - Verify: Build the analytics app.
