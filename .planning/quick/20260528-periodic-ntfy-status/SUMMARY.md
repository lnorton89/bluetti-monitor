---
status: complete
---

# Quick Task 20260528: Periodic ntfy Status - Summary

## Completed

- Changed ntfy from battery-full-only delivery to recurring power status notifications.
- Added a persisted ntfy interval setting with 5, 15, 30, and 60 minute options.
- Updated Settings copy to describe ntfy as recurring input/output/SOC status publishing.
- Changed ntfy sending to use query parameters instead of custom headers, reducing browser preflight friction.
- Added unit coverage for recurring status notification text.

## Verification

- `bun test dashboard/test-unit/notifications.test.ts`
- `npm run build` from `dashboard/`
