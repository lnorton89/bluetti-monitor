# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 - UI Cleanup And Reliability

**Shipped:** 2026-04-21  
**Phases:** 7 | **Plans:** 13 | **Sessions:** 1

### What Was Built

- A thinner, more coherent shell and route identity model across desktop and mobile.
- Consistent telemetry trust-state handling across all main dashboard routes.
- A shared UI surface system plus responsive phone-sized refinements and regression coverage.
- Formal verification, validation, and milestone traceability backfill for the original Phase 06 through 08 work.

### What Worked

- Treating the milestone audit gaps as documentation and traceability problems avoided unnecessary product churn.
- Shared-surface and responsive work built well on the earlier shell and trust-state foundations.

### What Was Inefficient

- Formal verification artifacts were added too late, which forced a second wave of documentation-only phases.
- Milestone summary files drifted into malformed state and needed manual cleanup during archive.

### Patterns Established

- Shared dashboard UI work should land with explicit verification artifacts while the implementation is still fresh.
- Milestone gap-closure phases can be small and effective when they focus strictly on evidence and traceability.

### Key Lessons

1. If a phase ships product behavior, create the verification artifact before moving on to milestone closeout.
2. UI stabilization work benefits from layering: shell first, trust states second, shared surfaces third, responsive polish fourth.

### Cost Observations

- Model mix: not tracked in detail
- Sessions: 1 visible archive/closeout session after the verification backfill sequence
- Notable: most late cost came from audit cleanup rather than new code

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 | 5 | Established the browser-first bridge path and LAN PWA baseline |
| v1.1 | 1 | 7 | Added formal verification discipline after shipping UX stabilization work |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | Smoke and verification scripts | Functional baseline | 0 tracked |
| v1.1 | Playwright responsive/shared-surface coverage plus verification backfill | 12/12 milestone requirements satisfied | 0 tracked |

### Top Lessons (Verified Across Milestones)

1. Clear runtime ownership and clear UI ownership both reduce rework later.
2. Shipping is smoother when milestone evidence is maintained continuously instead of reconstructed at the end.
