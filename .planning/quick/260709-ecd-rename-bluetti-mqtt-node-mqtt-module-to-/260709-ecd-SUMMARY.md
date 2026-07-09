---
quick_id: 260709-ecd
status: complete
---

# Summary

Renamed the internal MQTT module to `broker` and removed the postbuild workaround.

## Changes

- Moved `src/mqtt` to `src/broker`.
- Replaced `@mqtt/*` with `@broker/*` in `tsconfig.json`.
- Updated imports/exports in `src/index.ts`, `src/app/server.ts`, and `src/cli/bluetti-mqtt.ts`.
- Updated tests to import built broker code from `dist/broker/client.js`.
- Updated README architecture reference from `src/mqtt` to `src/broker`.
- Deleted `scripts/postbuild.mjs`.
- Changed `npm run build` to remove stale `dist` and then run `tsc` plus `tsc-alias`.

## Verification

- `npm --workspaces=false run build` passed.
- Generated `dist/broker/client.js` imports `connectAsync` from `"mqtt"`, not a relative `../mqtt` path.
- `dist/mqtt` is no longer generated after a clean build.
- `npm --workspaces=false run lint` passed.
- `npm --workspaces=false run coverage` passed.

