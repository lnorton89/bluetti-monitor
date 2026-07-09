---
quick_id: 260709-epi
slug: update-bluetti-mqtt-node-readme
status: complete
---

# Update bluetti-mqtt-node README

## Goal

Bring the `lib/bluetti-mqtt-node` README up to date after the broker rename, MQTT TLS support, c8 coverage, CI validation changes, and new contributor docs.

## Plan

1. Update feature, requirement, setup, and validation text.
2. Document MQTT TLS CLI flags and config-file fields.
3. Refresh development and CI notes to match `npm run validate`.
4. Link to `CHANGELOG.md` and `CONTRIBUTING.md`.
5. Verify the documentation changes do not break validation-sensitive files.
