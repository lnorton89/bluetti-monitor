---
quick_id: 260708-vig
status: in_progress
---

# Recover BLE polling after Windows GATT link loss

1. Treat Windows GATT `Unreachable` write failures as connection failures rather than generic fatal errors.
2. On a connection failure during polling, disconnect the invalid session, reconnect with bounded backoff, and resume polling without terminating the bridge.
3. Emit structured logs for connection loss, retry timing, and successful recovery.
4. Add regression coverage for error classification and in-process recovery.
5. Run the workspace library test and build commands.
