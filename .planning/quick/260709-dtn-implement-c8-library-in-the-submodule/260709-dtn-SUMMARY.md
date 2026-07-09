---
quick_id: 260709-dtn
status: complete
---

# Summary

Implemented c8 coverage tooling in `lib/bluetti-mqtt-node`.

## Changes

- Added `c8` to the submodule dev dependencies.
- Added `npm run coverage`, which runs `npm run build` and then executes `node test/run-all.mjs` under `c8`.
- Regenerated `package-lock.json` with `--workspaces=false` so npm treats the submodule as its own package instead of the root workspace.

## Verification

- `npm run coverage` passed in `lib/bluetti-mqtt-node`.
- Coverage summary reported all files at 83.25% statements, 81.64% branches, 86.74% functions, and 83.25% lines.

