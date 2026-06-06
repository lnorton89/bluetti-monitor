# Roadmap: Bluetti Monitor

## Milestones

- [x] **v1.0 MVP** - Core Bluetti monitoring with mobile PWA (shipped 2026-04-16, archive: `.planning/milestones/v1.0-ROADMAP.md`)
- [x] **v1.1 UI Cleanup And Reliability** - Shell coherence, trust-state handling, shared UI surfaces, responsive reliability, and audit backfill shipped (2026-04-21, archive: `.planning/milestones/v1.1-ROADMAP.md`)
- [x] **v1.2 Settings And Preferences** - Dedicated settings surface for real app preferences, persisted behavior, and clearer ownership of configurable options (shipped 2026-04-22, archive: `.planning/milestones/v1.2-ROADMAP.md`)
- [ ] **v1.3 Estimation Accuracy** - Overhaul Runtime and Time to Full using multi-tactic estimates, historical calibration, backtesting, and transparent dashboard confidence.

## Current Status

Active milestone: **v1.3 Estimation Accuracy**

Next recommended step:

- `$gsd-complete-milestone`

## Phase Details

### Phase 15: Estimation Accuracy Overhaul (Verified 2026-06-05)

**Goal:** Replace the current brittle Runtime and Time to Full sections with a historically calibrated estimation model and dashboard presentation that explains source, confidence, and unavailable states.

**Depends on:** v1.0 battery estimate baseline, v1.1 trust-state UI, v1.2 settings ownership, SQLite telemetry history.

**Requirements:** EST-01, EST-02, EST-03, EST-04, EST-05, EST-06, EST-07, VAL-01, VAL-02, VAL-03, UI-01, UI-02

**Success criteria:**
1. Runtime and Time to Full are produced by one canonical estimate model used by every dashboard surface.
2. The model combines direct device counters, instantaneous power balance, recent SOC trend, and historical similar-window calibration.
3. Historical backtesting report identifies usable charge/discharge windows, estimate error, rejected data, and confidence thresholds.
4. Dashboard estimate cards explain source, confidence, key inputs, and why an estimate is unavailable.
5. Unit and fixture tests cover the estimate tactics and regression cases that previously made the counters misleading.

**Plans:**
- 15-01: Audit estimate inputs and current consumers.
- 15-02: Build canonical multi-tactic estimation model.
- 15-03: Add historical calibration and backtesting report.
- 15-04: Wire dashboard UI, confidence copy, and tests.

## Archive Index

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- `.planning/milestones/v1.1-ROADMAP.md`
- `.planning/milestones/v1.1-REQUIREMENTS.md`
- `.planning/milestones/v1.1-MILESTONE-AUDIT.md`
- `.planning/milestones/v1.2-ROADMAP.md`
- `.planning/milestones/v1.2-REQUIREMENTS.md`
