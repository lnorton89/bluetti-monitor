---
status: complete
---

# Quick Task 20260528: ntfy Notifications - Summary

## Completed

- Added persisted ntfy alert settings: enabled, server URL, and topic.
- Added Settings page controls for enabling ntfy and editing server/topic.
- Added ntfy delivery for battery-full alerts using the existing notification trigger.
- Included current input, output, and SOC in the notification body.
- Added unit coverage for ntfy URL building and live power summarization.

## Verification

- `bun test dashboard/test-unit/notifications.test.ts`
- `npm run build` from `dashboard/`
