---
quick_id: 260709-epi
status: complete
---

# Summary

Updated the `lib/bluetti-mqtt-node` README so it reflects the current broker module and validation workflow.

## Changes

- Added a quick-start section for local and packaged-helper workflows.
- Documented optional MQTT TLS CLI flags and config-file fields.
- Updated requirements from "Node.js 22+ recommended" to "Node.js 22 or newer".
- Replaced `npm install` setup guidance with `npm ci`.
- Updated validation and CI docs to describe `npm run validate`, coverage, lint, and the Node.js matrix.
- Added links to `CONTRIBUTING.md` and `CHANGELOG.md`.

## Verification

- `npm --workspaces=false run validate` passed in `lib/bluetti-mqtt-node`.

## Commits

- Submodule: `44e609d` (`docs: refresh broker README`)
