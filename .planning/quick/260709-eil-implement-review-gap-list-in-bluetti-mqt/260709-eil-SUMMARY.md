---
quick_id: 260709-eil
status: complete
---

# Summary

Implemented the review gap list in `lib/bluetti-mqtt-node`.

## Changes

- Changed CI to run a single `npm run validate` step.
- Added a Node.js version matrix for 22.x, 24.x, and 26.x.
- Updated `validate` to include typecheck, lint, tests, coverage, and helper build.
- Extracted helper request framing into `src/bluetooth/helper-request.ts`.
- Extracted helper line routing/error mapping into `src/bluetooth/helper-line-router.ts`.
- Extracted MQTT broker connection option construction into `src/broker/connection-options.ts`.
- Renamed `test/mqtt-client.test.mjs` to `test/broker-client.test.mjs`.
- Added direct helper request tests and broker connection option coverage.
- Added `CHANGELOG.md` and `CONTRIBUTING.md`.

## Verification

- `npm --workspaces=false run validate` passed.
- Coverage summary reported 85.72% statements, 83.17% branches, 88.72% functions, and 85.72% lines.
- `src/bluetooth/helper-client.ts` is down to 490 lines.
- `src/broker/client.ts` is down to 506 lines.

## Commits

- Submodule: `a8ed045` (`chore: tighten broker CI and module boundaries`)
