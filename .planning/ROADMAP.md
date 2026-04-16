# Roadmap: Bluetti Monitor

## Milestones

- ✅ **v1.0 MVP** — Core Bluetti monitoring with mobile PWA (shipped 2026-04-16)
- 🚧 **v1.1 UI Cleanup And Reliability** — In planning

## Phase Details

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-04-16</summary>

- [x] Phase 1: Complete Bridge Migration (3/3) — completed 2026-04-03
- [x] Phase 2: Harden Integration Boundaries (3/3) — completed 2026-04-03
- [x] Phase 3: Add Battery Estimates (3/3) — completed 2026-04-16
- [x] Phase 4: Ship Mobile LAN Dashboard (2/2) — completed 2026-04-16
- [x] Phase 5: Installable PWA Polish (2/2) — completed 2026-04-16

</details>

### v1.1 UI Cleanup And Reliability [Planned]

- [x] Phase 6: Unify Shell And Navigation (0/0) — completed
- [ ] Phase 7: Fix Telemetry Trust States (2/2) — planned
- [ ] Phase 8: Consolidate Shared UI Surfaces (0/0) — planned
- [ ] Phase 9: Finish Responsive Reliability Pass (0/0) — planned

#### Phase 6: Unify Shell And Navigation

Goal: Make the dashboard shell coherent so route identity, primary status, and navigation behave consistently across desktop and mobile.

Requirements:
- UI-01
- UI-02
- UI-03

Success criteria:
1. The shell communicates page identity without duplicated or competing headers.
2. Navigation works cleanly on desktop and mobile.
3. Overview, charts, solar, and raw-data pages feel like part of the same product surface.

#### Phase 7: Fix Telemetry Trust States

Goal: Repair how the dashboard communicates loading, offline, stale, missing, and partial telemetry so users can trust what they are seeing.

Requirements:
- UI-04
- UI-05
- UI-06

Success criteria:
1. Every major view distinguishes loading, empty, offline, stale, and partial states.
2. Telemetry summaries avoid implying confidence when data is missing or weak.
3. State handling is consistent across overview, charts, solar, and raw-data pages.

#### Phase 8: Consolidate Shared UI Surfaces

Goal: Replace route-specific UI drift with a cleaner shared surface system for controls, cards, and information hierarchy.

Requirements:
- UI-07
- UI-08
- UI-09

Success criteria:
1. Shared cards, controls, and status surfaces are reused across routes.
2. Inline one-off styling is reduced in favor of stable UI patterns.
3. Spacing, typography, and density feel intentional instead of stitched together.

#### Phase 9: Finish Responsive Reliability Pass

Goal: Make the dashboard consistently usable on phone-sized screens by simplifying layouts and interaction patterns where needed.

Requirements:
- UI-10
- UI-11
- UI-12

Success criteria:
1. Main pages remain usable and readable on phone-sized screens.
2. Tables, segmented controls, and scorecards collapse intentionally instead of breaking.
3. Mobile feels like a coherent extension of the same dashboard experience.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|----------|
| 1. Complete Bridge Migration | 3/3 | Complete | 2026-04-03 |
| 2. Harden Integration Boundaries | 3/3 | Complete | 2026-04-03 |
| 3. Add Battery Estimates | 3/3 | Complete | 2026-04-16 |
| 4. Ship Mobile LAN Dashboard | 2/2 | Complete | 2026-04-16 |
| 5. Installable PWA Polish | 2/2 | Complete | 2026-04-16 |
| 6. Unify Shell And Navigation | 0/0 | Complete | 2026-04-16 |
| 7. Fix Telemetry Trust States | 2/2 | Planned | — |
| 8. Consolidate Shared UI Surfaces | 0/0 | Planned | — |
| 9. Finish Responsive Reliability Pass | 0/0 | Planned | — |

---

_See `.planning/milestones/v1.0-ROADMAP.md` for full archived details._
