---
status: complete
quick_id: 260715-fxc
commit: 76e4185
---

# Summary

Changed the local dashboard development server from port 5173 to port 5400 in the monitor supervisor, combined development launcher, and active documentation.

## Verification

- `npm run build` completed successfully in `dashboard/`.
- A live Vite smoke test returned HTTP 200 from `http://127.0.0.1:5400/`.
- No active references to port 5173 remain outside historical planning and Git artifacts.

## Files changed

- `scripts/monitor/shared.mjs`
- `scripts/dev-all.mjs`
- `README.md`
