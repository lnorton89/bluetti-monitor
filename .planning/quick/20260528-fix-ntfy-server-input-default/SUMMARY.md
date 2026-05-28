---
status: complete
---

# Quick Task 20260528: Fix ntfy Server Input and Default - Summary

## Completed

- Changed the default ntfy server to `https://ntfy.sh`.
- Stopped stripping trailing slashes while the ntfy server setting is being edited.
- Kept URL cleanup in the ntfy publish URL builder instead.
- Added test coverage for server/topic slash normalization at send-time.

## Verification

- `bun test dashboard/test-unit/notifications.test.ts`
- `npm run build` from `dashboard/`
