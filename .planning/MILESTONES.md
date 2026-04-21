# Milestones

## v1.1 UI Cleanup And Reliability (Shipped: 2026-04-21)

**Scope:** 7 phases, 13 plans

**Key accomplishments:**

- Unified the dashboard shell so route identity, top-level status, and navigation feel coherent across desktop and mobile.
- Standardized loading, offline, stale, and estimate-confidence handling across Overview, Charts, Solar, and Raw Data.
- Introduced a shared UI surface system with reusable cards, chips, tiles, info rows, page headers, and shared controls.
- Added dedicated phone-sized responsive behavior and regression coverage so the dashboard works like one product across screen sizes.
- Backfilled the missing verification and validation artifacts so the full milestone now passes formal audit with 12/12 requirements satisfied.

---

## v1.0 MVP (Shipped: 2026-04-16)

**Scope:** 5 phases, 13 plans

**Key accomplishments:**

- Established `monitor:start` and `monitor:verify` as the browser-first local monitoring path.
- Removed the old bridge ambiguity and pinned `bluetti-mqtt-node` as the runtime bridge of record.
- Added live battery runtime and charge-to-full estimates.
- Delivered LAN phone-browser usability and installable PWA support.

---
