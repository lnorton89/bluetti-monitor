---
quick_id: 260709-eil
slug: implement-review-gap-list-in-bluetti-mqt
status: complete
---

# Implement Review Gap List In bluetti-mqtt-node

## Goal

Address the review gap list in `lib/bluetti-mqtt-node`: CI should run the full validation path including lint and coverage, large MQTT/helper files should have clear extraction seams, project docs should include changelog/contribution guidance, and CI should exercise the supported Node version range more honestly.

## Plan

1. Update `package.json` validation and GitHub Actions CI so one CI command runs typecheck, lint, tests, coverage, and helper build.
2. Add a Node version matrix instead of only testing Node 22.
3. Extract helper protocol/request mechanics from `src/bluetooth/helper-client.ts`.
4. Extract MQTT connection option building from `src/broker/client.ts`.
5. Add focused tests for the extracted option builder.
6. Add `CHANGELOG.md` and `CONTRIBUTING.md`.
7. Verify with `npm --workspaces=false run validate`.
