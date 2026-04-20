# Roadmap: Bluetti Monitor

## Milestones

- [x] **v1.0 MVP** - Core Bluetti monitoring with mobile PWA (shipped 2026-04-16)
- [ ] **v1.1 UI Cleanup And Reliability** - execution complete, ready for milestone audit

## Phase Details

<details>
<summary>[x] v1.0 MVP (Phases 1-5) - SHIPPED 2026-04-16</summary>

- [x] Phase 1: Complete Bridge Migration (3/3) - completed 2026-04-03
- [x] Phase 2: Harden Integration Boundaries (3/3) - completed 2026-04-03
- [x] Phase 3: Add Battery Estimates (3/3) - completed 2026-04-16
- [x] Phase 4: Ship Mobile LAN Dashboard (2/2) - completed 2026-04-16
- [x] Phase 5: Installable PWA Polish (2/2) - completed 2026-04-16

</details>

### v1.1 UI Cleanup And Reliability [Ready For Re-Audit]

- [x] Phase 6: Unify Shell And Navigation (0/0) - completed 2026-04-16
- [x] Phase 7: Fix Telemetry Trust States (2/2) - completed 2026-04-17
- [x] Phase 8: Consolidate Shared UI Surfaces (3/3) - completed 2026-04-16
- [x] Phase 9: Finish Responsive Reliability Pass (4/4) - completed 2026-04-19
- [x] Phase 10: Backfill Phase 06 Verification (0/0) - planned (completed 2026-04-20)
- [x] Phase 11: Backfill Phase 07 Verification And Validation (0/0) - planned (completed 2026-04-20)
- [x] Phase 12: Backfill Phase 08 Verification And Milestone Metadata Sync (2/2) - completed 2026-04-20

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

Plans:
- [x] 08-01-PLAN.md - Extract shared CSS tokens and surface components
- [x] 08-02-PLAN.md - Refactor Overview and RawData to use shared components
- [x] 08-03-PLAN.md - Refactor Charts and Solar to use shared components and controls

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

Plans:
- [x] 09-01-PLAN.md - Stabilize the shared responsive shell and narrow-screen layout contract
- [x] 09-02-PLAN.md - Make Overview and Raw Data intentionally usable on phones
- [x] 09-03-PLAN.md - Make Charts and Solar controls and report surfaces reliable on phones
- [x] 09-04-PLAN.md - Add responsive regression coverage for the phone-sized dashboard contract

#### Phase 10: Backfill Phase 06 Verification

Goal: Restore formal milestone traceability for the Phase 06 shell and navigation work by producing the verification artifact the audit expects.

Requirements:
- UI-01
- UI-02
- UI-03

Gap Closure:
- Closes the milestone audit requirement gaps caused by missing `06-VERIFICATION.md`
- Reconciles Phase 06 validation evidence so shell and navigation work is consumable by milestone audit

Success criteria:
1. Phase 06 has a `06-VERIFICATION.md` that ties plans, summaries, UAT, and tests back to UI-01 through UI-03.
2. Phase 06 validation evidence is updated from draft-like status to a clearly completed verification record.
3. Milestone traceability can count Phase 06 as satisfied without relying on inference.

#### Phase 11: Backfill Phase 07 Verification And Validation

Goal: Complete the missing verification package for telemetry trust-state work so Phase 07 can satisfy its milestone requirements formally.

Requirements:
- UI-04
- UI-05
- UI-06

Gap Closure:
- Closes the milestone audit requirement gaps caused by missing `07-VERIFICATION.md`
- Adds the missing `07-VALIDATION.md` needed for Nyquist-complete phase evidence

Success criteria:
1. Phase 07 has a `07-VERIFICATION.md` that maps delivered behavior to UI-04 through UI-06.
2. Phase 07 has a `07-VALIDATION.md` with completed validation evidence instead of an empty Nyquist gap.
3. Milestone audit can count telemetry trust and state handling as formally satisfied.

#### Phase 12: Backfill Phase 08 Verification And Milestone Metadata Sync

Goal: Close the last verification gap in v1.1 and align project-level milestone metadata with the work already completed.

Requirements:
- UI-07
- UI-08
- UI-09

Gap Closure:
- Closes the milestone audit requirement gaps caused by missing `08-VERIFICATION.md`
- Updates stale project and milestone metadata that still imply v1.1 is partially in flight

Success criteria:
1. Phase 08 has a `08-VERIFICATION.md` grounded in existing UAT, security, validation, and implementation evidence.
2. Project and milestone metadata reflect that Phases 08 and 09 are already complete and that only audit backfill remains.
3. Milestone audit can count the shared UI system work as formally satisfied.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|----------|
| 1. Complete Bridge Migration | 3/3 | Complete | 2026-04-03 |
| 2. Harden Integration Boundaries | 3/3 | Complete | 2026-04-03 |
| 3. Add Battery Estimates | 3/3 | Complete | 2026-04-16 |
| 4. Ship Mobile LAN Dashboard | 2/2 | Complete | 2026-04-16 |
| 5. Installable PWA Polish | 2/2 | Complete | 2026-04-16 |
| 6. Unify Shell And Navigation | 0/0 | Complete | 2026-04-16 |
| 7. Fix Telemetry Trust States | 2/2 | Complete | 2026-04-17 |
| 8. Consolidate Shared UI Surfaces | 3/3 | Complete | 2026-04-16 |
| 9. Finish Responsive Reliability Pass | 4/4 | Complete | 2026-04-19 |
| 10. Backfill Phase 06 Verification | 2/2 | Complete    | 2026-04-20 |
| 11. Backfill Phase 07 Verification And Validation | 2/2 | Complete    | 2026-04-20 |
| 12. Backfill Phase 08 Verification And Milestone Metadata Sync | 2/2 | Complete | 2026-04-20 |

---

_See `.planning/milestones/v1.0-ROADMAP.md` for full archived details._
