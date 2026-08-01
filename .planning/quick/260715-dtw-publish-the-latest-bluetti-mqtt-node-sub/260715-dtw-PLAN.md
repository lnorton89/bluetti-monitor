---
quick_id: 260715-dtw
status: in_progress
---

# Publish bluetti-mqtt-node 1.0.1

1. Confirm the checked-out submodule is clean and its package version is newer than npm.
2. Run the package validation suite and inspect the npm tarball dry-run.
3. Authenticate to npm if needed, publish version 1.0.1 with the default latest tag, and verify the registry result.
4. Record the outcome in the quick-task summary and project state.

## Must haves

- The published contents are produced from submodule commit `01280a4f43cbc4b47fb14e4ae87bac8aa5fdab0b`.
- Tests, lint, types, coverage, and helper build pass before publishing.
- npm reports `bluetti-mqtt-node@1.0.1` after publishing.
