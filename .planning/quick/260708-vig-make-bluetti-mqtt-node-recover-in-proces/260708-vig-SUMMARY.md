---
status: complete
quick_id: 260708-vig
---

# BLE link-loss recovery

The Windows helper now classifies GATT write failures containing `Unreachable` as connection failures. The polling loop replaces the invalid session, reconnects and resubscribes in-process, retries failed reconnects with bounded backoff, and emits structured loss/recovery logs.

Regression tests cover the exact observed Windows error and successful polling recovery.

Verification:

- `npm test` passed
- `npm run typecheck` passed
- `git diff --check` passed

Library commit: `4dba3f6`
