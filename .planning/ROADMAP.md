# Roadmap: Bluetti Monitor

## Milestones

- [x] **v1.0 MVP** - Core Bluetti monitoring with mobile PWA (shipped 2026-04-16, archive: `.planning/milestones/v1.0-ROADMAP.md`)
- [x] **v1.1 UI Cleanup And Reliability** - Shell coherence, trust-state handling, shared UI surfaces, responsive reliability, and audit backfill shipped (2026-04-21, archive: `.planning/milestones/v1.1-ROADMAP.md`)
- [ ] **v1.2 Settings And Preferences** - Add a dedicated settings surface for real app preferences, persisted behavior, and clearer ownership of configurable options

## Current Status

Active milestone: **v1.2 Settings And Preferences**

Next recommended step:

- `$gsd-verify-work 14`

## Phase Details

### v1.2 Settings And Preferences

- [x] **Phase 13: Add Settings Foundation And Persistence**
  Goal: Establish the settings route, navigation entry, preference schema, storage layer, and clear boundaries for what the app can configure safely.
  Requirements: SET-01, SET-04, SET-06, SET-09
  Success criteria:
  1. A dedicated settings route exists and is reachable from the main shell navigation.
  2. Settings data has a typed/defaulted model with safe fallback behavior for missing or invalid persisted values.
  3. The app cleanly separates app preferences from live telemetry or unsupported device-control concepts.
  Plans:
  - [x] `13-01-PLAN.md` - Add settings route, navigation entry, and preference store foundation

- [x] **Phase 14: Ship Settings Page UX And Live Wiring**
  Goal: Deliver the actual settings page UI and wire high-value preferences into visible shell/dashboard behavior.
  Requirements: SET-02, SET-03, SET-05, SET-07, SET-08
  Success criteria:
  1. Settings are grouped into understandable sections with clear labels and help text.
  2. Supported preferences visibly apply to the relevant app surfaces and persist across reloads.
  3. The page communicates setting impact clearly, including immediate/app-only vs deferred behavior where relevant.
  Plans:
  - [x] `14-01-PLAN.md` - Build grouped settings page sections and wire supported preferences into shell/dashboard behavior

## Archive Index

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- `.planning/milestones/v1.1-ROADMAP.md`
- `.planning/milestones/v1.1-REQUIREMENTS.md`
- `.planning/milestones/v1.1-MILESTONE-AUDIT.md`
