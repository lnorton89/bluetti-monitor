---
status: complete
---

# Quick Task 20260520: Analytics History Window - Summary

## Completed

- Confirmed the 24h analytics request was clipped by the `5000` row per-field API cap; at the current sampling rate, 5000 rows covered about 14.44 hours.
- Increased analytics range limits to 12,000 rows for 24h, 36,000 for 3d, and 84,000 for 7d.
- Raised the FastAPI history maximum to 100,000 rows per field.
- Updated README history limit documentation.

## Verification

- Before the fix, `/history/...limit=5000&since=<24h>` returned 5000 rows spanning about 14.44 hours.
- After the fix, the analytics build passed.
