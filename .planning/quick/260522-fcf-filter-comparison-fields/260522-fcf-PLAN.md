# Quick Task 260522-fcf: Filter Comparison Fields

## Goal

Remove administrative/static fields from the Field Comparison picker so it only offers useful telemetry signals.

## Tasks

1. Add an explicit exclusion list for identity, firmware, pack-count, raw, and status/config fields.
2. Apply that filter before rendering Field Comparison chips or preserving selected fields.
3. Verify build and rendered picker contents.

