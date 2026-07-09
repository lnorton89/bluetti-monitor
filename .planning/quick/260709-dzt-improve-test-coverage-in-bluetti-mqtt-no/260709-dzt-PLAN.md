---
quick_id: 260709-dzt
slug: improve-test-coverage-in-bluetti-mqtt-no
status: complete
---

# Improve Test Coverage In bluetti-mqtt-node

## Goal

Improve meaningful coverage in the `lib/bluetti-mqtt-node` submodule after adding the `c8` coverage command.

## Plan

1. Use the c8 report to identify high-value uncovered areas.
2. Add focused tests for `DeviceCommandRunner` command handling, read result classification, and pack polling.
3. Extend helper-client tests for public request methods, payload validation, scan filtering, and timeout selection.
4. Register new tests in `test/run-all.mjs`.
5. Verify with `npm --workspaces=false run coverage`.

