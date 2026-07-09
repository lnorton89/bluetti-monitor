---
quick_id: 260709-dtn
slug: implement-c8-library-in-the-submodule
status: complete
---

# Implement c8 Library In The Submodule

## Goal

Add c8 coverage tooling to `lib/bluetti-mqtt-node` so the submodule can run its existing build-and-smoke-test flow with coverage reporting.

## Plan

1. Add `c8` as a submodule dev dependency.
2. Add a package script that builds the library and runs the existing test runner through `c8`.
3. Regenerate the submodule `package-lock.json`.
4. Verify the new coverage command passes.

