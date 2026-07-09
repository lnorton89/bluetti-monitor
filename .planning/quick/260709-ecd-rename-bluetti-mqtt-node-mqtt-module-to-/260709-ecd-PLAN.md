---
quick_id: 260709-ecd
slug: rename-bluetti-mqtt-node-mqtt-module-to-
status: complete
---

# Rename bluetti-mqtt-node MQTT Module To Broker

## Goal

Rename the internal `mqtt` source module to `broker` so `tsc-alias` no longer confuses the local output directory with the external `mqtt` package, allowing the postbuild rewrite script to be removed.

## Plan

1. Move `src/mqtt` to `src/broker`.
2. Replace the `@mqtt/*` path alias with `@broker/*`.
3. Update internal imports, public barrel exports, tests, and README references.
4. Remove `scripts/postbuild.mjs` and have `build` run `tsc-alias` directly.
5. Ensure the build starts from a clean `dist` so stale `dist/mqtt` output cannot reintroduce the alias collision.
6. Verify generated output imports the external `mqtt` package by name and run lint/coverage.

