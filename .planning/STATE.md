---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Estimation Accuracy
status: phase_complete
stopped_at: phase 15 implemented and ready for UAT
last_updated: "2026-05-18T00:00:00.000Z"
last_activity: 2026-05-29
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
Last activity: 2026-05-29 - Completed quick task 260529-lql: Blueprint dark theme — greyish-blue tone

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
| 20260520 | Fix analytics history range clipping | 2026-05-20 | working tree | [20260520-analytics-history-window](./quick/20260520-analytics-history-window/) |
| 20260520 | Use rainbow colors for analytics charts | 2026-05-20 | working tree | [20260520-rainbow-analytics-charts](./quick/20260520-rainbow-analytics-charts/) |
| 260522-bvp | Analytics Battery Posture voltage line | 2026-05-22 | working tree | [260522-bvp-analytics-battery-posture-voltage-line](./quick/260522-bvp-analytics-battery-posture-voltage-line/) |
| 260522-rfh | Remove Resolved Fields and align analytics panels | 2026-05-22 | working tree | [260522-rfh-remove-resolved-fields-align-analytics-panels](./quick/260522-rfh-remove-resolved-fields-align-analytics-panels/) |
| 260522-bpl | Clarify Battery Posture labels | 2026-05-22 | working tree | [260522-bpl-clarify-battery-posture-labels](./quick/260522-bpl-clarify-battery-posture-labels/) |
| 260522-fsl | Fix analytics Field Comparison spacing and search border | 2026-05-22 | working tree | [260522-fsl-fix-analytics-field-spacing-search-border](./quick/260522-fsl-fix-analytics-field-spacing-search-border/) |
| 260522-fcc | Color code Field Comparison chips | 2026-05-22 | working tree | [260522-fcc-color-code-field-comparison-chips](./quick/260522-fcc-color-code-field-comparison-chips/) |
| 260522-ghv | Add graph hover values | 2026-05-22 | working tree | [260522-ghv-add-graph-hover-values](./quick/260522-ghv-add-graph-hover-values/) |
| 260522-aif | Add analytics icon favicon | 2026-05-22 | working tree | [260522-aif-add-analytics-icon-favicon](./quick/260522-aif-add-analytics-icon-favicon/) |
| 260522-hub | Uppercase bold analytics header | 2026-05-22 | working tree | [260522-hub-uppercase-bold-analytics-header](./quick/260522-hub-uppercase-bold-analytics-header/) |
| 260522-fcr | Isolate Field Comparison renders | 2026-05-22 | working tree | [260522-fcr-isolate-field-comparison-renders](./quick/260522-fcr-isolate-field-comparison-renders/) |
| 260522-ckp | Compact analytics KPI cards | 2026-05-22 | working tree | [260522-ckp-compact-analytics-kpi-cards](./quick/260522-ckp-compact-analytics-kpi-cards/) |
| 260522-kir | Right align KPI icons | 2026-05-22 | working tree | [260522-kir-right-align-kpi-icons](./quick/260522-kir-right-align-kpi-icons/) |
| 260522-fcf | Filter comparison fields | 2026-05-22 | working tree | [260522-fcf-filter-comparison-fields](./quick/260522-fcf-filter-comparison-fields/) |
| 260522-dfc | Default Field Comparison selection | 2026-05-22 | working tree | [260522-dfc-default-field-comparison-selection](./quick/260522-dfc-default-field-comparison-selection/) |
| 260522-twh | Match time window control height | 2026-05-22 | working tree | [260522-twh-time-window-height-match](./quick/260522-twh-time-window-height-match/) |
| 260522-dsp | Device select padding | 2026-05-22 | working tree | [260522-dsp-device-select-padding](./quick/260522-dsp-device-select-padding/) |
| 260522-mvf | Make analytics mobile view more friendly | 2026-05-22 | working tree | [260522-mvf-mobile-friendly-analytics](./quick/260522-mvf-mobile-friendly-analytics/) |
| 260522-nas | Netlify static analytics export | 2026-05-22 | working tree | [260522-netlify-analytics-static-export](./quick/260522-netlify-analytics-static-export/) |
| 260523-debug | Resolve Windows CEF CPU issue by returning to native renderer | 2026-05-23 | working tree | [.planning/debug/cef-gpu-process-cpu.md](./debug/cef-gpu-process-cpu.md) |
| 20260528 | Add a solar input graph for voltage, wattage, and frequency in the analytics app | 2026-05-28 | working tree | [20260528-solar-input-graph](./quick/20260528-solar-input-graph/) |
| 20260528 | Remove frequency from Solar Input and adjust analytics chart widths | 2026-05-28 | working tree | [20260528-analytics-layout-followup](./quick/20260528-analytics-layout-followup/) |
| 20260528 | Add highlight stats to Power Balance and Solar Input analytics panels | 2026-05-28 | working tree | [20260528-analytics-panel-highlights](./quick/20260528-analytics-panel-highlights/) |
| 20260528 | Add average solar wattage to Solar Input highlights | 2026-05-28 | working tree | [20260528-solar-wattage-avg-highlight](./quick/20260528-solar-wattage-avg-highlight/) |
| 20260528 | Keep analytics panel highlights on one line | 2026-05-28 | working tree | [20260528-one-line-highlights](./quick/20260528-one-line-highlights/) |
| 20260528 | Add subtle hover and focus effects to analytics surfaces | 2026-05-28 | working tree | [20260528-analytics-hover-effects](./quick/20260528-analytics-hover-effects/) |
| 20260528 | Remove dead space between Power Balance chart and legend | 2026-05-28 | working tree | [20260528-power-balance-legend-gap](./quick/20260528-power-balance-legend-gap/) |
| 20260528 | Retheme analytics with retro futuristic pastels and dark greys | 2026-05-28 | working tree | [20260528-retro-futuristic-pastel-theme](./quick/20260528-retro-futuristic-pastel-theme/) |
| 20260528 | Soften analytics background and box borders | 2026-05-28 | working tree | [20260528-soften-analytics-background-borders](./quick/20260528-soften-analytics-background-borders/) |
| 20260528 | Add ntfy delivery for battery-full notifications | 2026-05-28 | working tree | [20260528-ntfy-notifications](./quick/20260528-ntfy-notifications/) |
| 20260528 | Make Settings page layout more compact and traditional | 2026-05-28 | working tree | [20260528-compact-settings-layout](./quick/20260528-compact-settings-layout/) |
| 20260528 | Fix ntfy server slash editing and default server | 2026-05-28 | working tree | [20260528-fix-ntfy-server-input-default](./quick/20260528-fix-ntfy-server-input-default/) |
| 20260528 | Change ntfy alerts to recurring input/output/SOC status notifications | 2026-05-28 | working tree | [20260528-periodic-ntfy-status](./quick/20260528-periodic-ntfy-status/) |
| 20260528 | Add analytics settings modal with light/dark theme switch | 2026-05-28 | working tree | [20260528-analytics-settings-theme-modal](./quick/20260528-analytics-settings-theme-modal/) |
| 20260528 | Theme analytics chart tooltips and topbar for light/dark mode | 2026-05-28 | working tree | [20260528-analytics-theme-tooltip-topbar](./quick/20260528-analytics-theme-tooltip-topbar/) |
| 20260528 | Theme analytics device bar instead of title topbar | 2026-05-28 | working tree | [20260528-analytics-device-bar-theme](./quick/20260528-analytics-device-bar-theme/) |
| 20260528 | Make analytics device select label inline and pad dropdown arrow | 2026-05-28 | working tree | [20260528-analytics-device-select-inline](./quick/20260528-analytics-device-select-inline/) |
| 20260528 | Animate selected analytics time window while telemetry is live | 2026-05-28 | working tree | [20260528-live-time-window-bars](./quick/20260528-live-time-window-bars/) |
| 20260528 | Remove visible analytics device selector label | 2026-05-28 | working tree | [20260528-remove-analytics-device-label](./quick/20260528-remove-analytics-device-label/) |
| 20260528 | Make live analytics time-window bar animation seamless | 2026-05-28 | working tree | [20260528-seamless-live-window-bars](./quick/20260528-seamless-live-window-bars/) |
| 20260528 | Add more right padding to the analytics device dropdown arrow | 2026-05-28 | working tree | [20260528-device-arrow-padding](./quick/20260528-device-arrow-padding/) |
| 20260528 | Darken analytics graph colors in light mode | 2026-05-28 | working tree | [20260528-darken-light-chart-colors](./quick/20260528-darken-light-chart-colors/) |
| 20260528 | Add inline analytics light/dark switch between refresh and settings | 2026-05-28 | working tree | [20260528-inline-analytics-theme-switch](./quick/20260528-inline-analytics-theme-switch/) |
| 20260528 | Reduce analytics chart rebuilds during load | 2026-05-28 | working tree | [20260528-analytics-load-render-warning](./quick/20260528-analytics-load-render-warning/) |
| 20260528 | Add settings for Field Comparison default fields | 2026-05-28 | working tree | [20260528-field-comparison-default-settings](./quick/20260528-field-comparison-default-settings/) |
| 260529-ith | Add analytics/test-results/ to .gitignore | 2026-05-29 | working tree | [260529-ith-add-analytics-test-results-to-gitignore](./quick/260529-ith-add-analytics-test-results-to-gitignore/) |
| 260529-lql | Blueprint dark theme — greyish-blue tone | 2026-05-29 | b00ed12 | [260529-lql-blueprint-skin-greyish-blue-dark-theme](./quick/260529-lql-blueprint-skin-greyish-blue-dark-theme/) |

## Session Continuity

Last session: 2026-04-22T00:00:00.000Z
Stopped at: v1.2 closeout completed
Resume file: .planning/PROJECT.md
