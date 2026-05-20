---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Estimation Accuracy
status: phase_complete
stopped_at: phase 15 implemented and ready for UAT
last_updated: "2026-05-18T00:00:00.000Z"
last_activity: 2026-05-18
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** I can reliably see the current state of my Bluetti system in one place without fighting brittle setup, unclear ownership between components, or hard-to-interpret telemetry.
**Current focus:** v1.3 Estimation Accuracy

## Current Position

Milestone: v1.3 Estimation Accuracy
Phase: 15 - Estimation Accuracy Overhaul
Plan: Complete
Status: Phase 15 implemented; ready for human UAT
Last activity: 2026-05-18 - Implemented Runtime and Time to Full overhaul with historical calibration and backtesting

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md.

### Pending Todos

- Run `$gsd-verify-work 15` for human validation against live telemetry.

### Blockers/Concerns

- Runtime and Time to Full have already had a quick stabilization pass, so the next fix should avoid another instantaneous-formula patch and instead validate against stored history.

### Roadmap Evolution

- Milestone v1.3 started: Estimation Accuracy.
- Phase 15 added: Estimation Accuracy Overhaul for Runtime and Time to Full.
- Phase 15 implemented: canonical multi-tactic estimate model, history bundle API, dashboard confidence/source UI, and backtest report tooling.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260421-jjb | Add tooltips to every UI stat showing source datapoints and calculation details, using clear accessible popovers and matching existing dashboard design | 2026-04-21 | working tree | [260421-jjb-add-tooltips-to-every-ui-stat-showing-so](./quick/260421-jjb-add-tooltips-to-every-ui-stat-showing-so/) |
| 260421-ket | Remove the Why This Layout Changed section from the overview page and fix the switchboard section so it reflects real on/off telemetry correctly | 2026-04-21 | working tree | [260421-ket-remove-the-why-this-layout-changed-secti](./quick/260421-ket-remove-the-why-this-layout-changed-secti/) |
| 260421-lqq | Improve the input, reserve, and output sections in the overview hero so they read more clearly and feel more intentional on desktop and mobile | 2026-04-21 | working tree | [260421-lqq-improve-the-input-reserve-and-output-sec](./quick/260421-lqq-improve-the-input-reserve-and-output-sec/) |
| 260421-lt8 | Normalize the three overview hero boxes so they render the same size and reduce visual clutter while keeping the important signal | 2026-04-21 | working tree | [260421-lt8-normalize-the-three-overview-hero-boxes-](./quick/260421-lt8-normalize-the-three-overview-hero-boxes-/) |
| 260422-fast | Remove deprecated `baseUrl` from root `tsconfig.json` while keeping the workspace path alias working | 2026-04-22 | working tree | root |
| 260422-z8q | Improve the Settings route UI and add persisted desktop log controls for enable/disable and truncation policy | 2026-04-22 | working tree | root |
| 260422-jma | Improve the bluetooth polling entry format in log files | 2026-04-22 | 3362046 | [260422-jma-improve-the-bluetooth-polling-entry-form](./quick/260422-jma-improve-the-bluetooth-polling-entry-form/) |
| 260425-k1x | Commit and push so trees are clean | 2026-04-25 | working tree | [260425-k1x-commit-and-push-so-trees-are-clean](./quick/260425-k1x-commit-and-push-so-trees-are-clean/) |
| 260427 | Stabilize Runtime and Time to Full counters | 2026-04-27 | working tree | [260427-fix-battery-estimate-counters](./quick/260427-fix-battery-estimate-counters/) |
| 20260501 | Battery health runtime report | 2026-05-01 | working tree | [20260501-battery-health-runtime-report](./quick/20260501-battery-health-runtime-report/) |
| 20260518 | Fix estimate sluggishness and layout regression | 2026-05-18 | working tree | [20260518-fix-estimate-sluggish-layout](./quick/20260518-fix-estimate-sluggish-layout/) |
| 20260520 | Add README for the standalone analytics app | 2026-05-20 | working tree | [20260520-analytics-readme](./quick/20260520-analytics-readme/) |
| 20260520 | Update the main README for analytics and estimate tooling | 2026-05-20 | working tree | [20260520-main-readme-update](./quick/20260520-main-readme-update/) |
| 20260520 | Use Google Sans in the standalone analytics app | 2026-05-20 | working tree | [20260520-google-sans-analytics](./quick/20260520-google-sans-analytics/) |

## Session Continuity

Last session: 2026-04-22T00:00:00.000Z
Stopped at: v1.2 closeout completed
Resume file: .planning/PROJECT.md
