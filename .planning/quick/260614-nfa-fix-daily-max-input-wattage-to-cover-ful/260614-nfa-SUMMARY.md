---
status: complete
---

# Quick Task 260614-nfa Summary

Fixed `Highest today` so the Overview input card is not based on a short rolling history window.

- Added `GET /stats/{device}/input-max?since=...` in the API.
- The endpoint walks all same-day `dc_input_power` and `ac_input_power` readings in timestamp order and returns the maximum running total input.
- Updated the Overview card to use the new stat endpoint and compare it with the current live input.
- Increased Solar daily input peak requests to the API's `100,000` row cap.

Verification:

- `python -m py_compile api/main.py` passed.
- `bun test dashboard/test-unit` passed.
- `bun run build` passed.
- Direct endpoint check returned `1450.0` for a synthetic day where the latest reading had fallen back to `1300`.

