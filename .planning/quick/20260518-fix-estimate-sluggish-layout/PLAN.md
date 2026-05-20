---
status: in-progress
created: 2026-05-18
---

# Fix Estimate Sluggishness And Layout Regression

The recent battery estimate overhaul made the dashboard sluggish and caused compact UI elements to disappear or crowd because expensive historical estimate calculations now run during live renders and the estimate strip now shows extra metadata inline.

## Tasks

- Cache heavy battery estimate computation in the component so websocket updates do not repeatedly rescan unchanged history.
- Avoid duplicate historical calibration work inside `buildBatteryEstimate`.
- Reduce historical fetch volume enough to preserve useful signal without making render cost painful.
- Make the estimate metadata compact so the estimate row does not crowd out nearby dashboard elements.
- Verify TypeScript/build and rerun the estimator timing check.
