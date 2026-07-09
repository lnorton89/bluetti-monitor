---
quick_id: 260709-et1
status: complete
---

# Summary

Fixed the `bluetti-mqtt-node` GitHub Actions validate failure caused by Windows checkout line-ending normalization.

## Changes

- Added `.gitattributes` in `lib/bluetti-mqtt-node`.
- Pinned formatter-sensitive text files to LF line endings.
- Marked generated/binary package artifacts as binary.

## Verification

- Confirmed Git attributes report `text` and `eol: lf` for representative source, test, workflow, README, and helper files.
- Confirmed binary attributes for representative generated/package artifacts.
- `npm --workspaces=false run validate` passed in `lib/bluetti-mqtt-node`.

## Commits

- Submodule: `3aecb40` (`fix: keep CI source checkouts LF-normalized`)
