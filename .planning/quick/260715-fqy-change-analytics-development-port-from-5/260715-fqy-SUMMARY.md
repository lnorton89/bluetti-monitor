---
status: complete
quick_id: 260715-fqy
commit: d010bec
---

# Summary

Changed the standalone analytics development server from port 5120 to port 5300 across Vite, the npm development command, Playwright defaults, and active documentation.

## Verification

- `npm run build` completed successfully in `analytics/`.
- A live Vite smoke test returned HTTP 200 from `http://127.0.0.1:5300/?mock=1`.
- No active references to port 5120 remain outside historical planning artifacts.

## Files changed

- `analytics/package.json`
- `analytics/vite.config.ts`
- `analytics/playwright.config.ts`
- `analytics/README.md`
- `README.md`
