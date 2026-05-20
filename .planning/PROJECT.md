# Bluetti Monitor

## What This Is

Bluetti Monitor is a personal-first monitoring stack for a Bluetti AC500 that combines a local desktop shell, a web dashboard, and a telemetry pipeline backed by MQTT and FastAPI. It gives me one reliable place to see power, battery, and device state from my desktop today while staying comfortable to use from my phone on the local network.

## Core Value

I can reliably see the current state of my Bluetti system in one place without fighting brittle setup, unclear ownership between components, or hard-to-interpret telemetry.

## Current Milestone: v1.3 Estimation Accuracy

**Goal:** Replace the brittle Runtime and Time to Full counters with an estimation system that is transparent, historically calibrated, and validated against real AC500 telemetry.

**Target features:**
- Audit the available AC500 telemetry fields and current estimate consumers so runtime ownership is explicit.
- Build a multi-tactic estimation model that combines direct device counters, instantaneous power balance, recent SOC trend, and historical calibration.
- Backtest estimates against stored SQLite telemetry and surface confidence/source explanations in the dashboard.

## Current State

- `v1.1 UI Cleanup And Reliability` shipped on 2026-04-21.
- The dashboard now has a coherent shell, consistent telemetry trust states, shared UI surfaces, and reliable phone-sized layouts.
- Formal milestone verification is complete across the v1.1 chain, including backfilled evidence for the original Phase 06, 07, and 08 work.
- `v1.2 Settings And Preferences` shipped on 2026-04-22 with a centralized settings surface and persisted app-owned preferences.
- The current runtime shape remains Bun/Electrobun desktop shell + FastAPI API + React dashboard + `bluetti-mqtt-node` bridge.
- Phase 15 of v1.3 is implemented: Runtime and Time to Full now use a canonical multi-tactic estimate model with source, confidence, historical calibration, and local backtesting support.

## Requirements

### Validated

- Live Bluetti telemetry flows into the dashboard through MQTT, FastAPI, and the React UI.
- Historical readings are stored in SQLite and exposed through REST endpoints.
- The dashboard provides overview, charts, solar, and raw-data views for current telemetry.
- The desktop shell can orchestrate the local monitoring stack and load the dashboard in a native window.
- The supported daily-use bridge path is `monitor:start` with `bluetti-mqtt-node` as the bridge of record.
- Legacy Python poller residue was removed without changing the Python API's role.
- Battery runtime and charge-to-full estimates are live, visible, and explain when estimates are unavailable.
- The dashboard works as a LAN-first mobile PWA.
- Shell/navigation, telemetry trust states, shared UI surfaces, and responsive behavior were all validated through v1.1.
- The app now has a dedicated settings page for app-owned preferences instead of scattered one-off controls.
- Settings persist safely across reloads and fall back cleanly when stored data is missing or invalid.
- Theme, battery-full alerts, analytics default window, and freshness cues are now wired through the settings page as real persisted preferences.
- Runtime and Time to Full estimates are computed through one canonical model that can use device counters, live net power, recent SOC trend, historical calibration, and historical similar-window matching.
- Estimate displays include source and confidence details, with tooltip explanations for inputs and caveats.
- Local SQLite telemetry can be backtested with `npm run estimate:backtest`.

### Active

- Run human UAT for the new Runtime and Time to Full estimates against a real charge or discharge cycle.

### Out Of Scope

- Native iOS or Android app.
- Cloud sync, accounts, or hosted remote relay.
- Public npm release of `bluetti-mqtt-node` until the package surface settles.

## Next Milestone Goals

- Make Runtime and Time to Full useful enough to trust during real discharge and charge cycles.
- Prefer measured history, calibration, and confidence over fragile single-formula estimates.
- Keep the implementation inside the current FastAPI, SQLite history, React dashboard, and Bun desktop shell architecture.

## Context

- This project is still for my own daily Bluetti monitoring first, though it should be clean enough that other Bluetti owners could use it later.
- `bluetti-mqtt-node` remains tracked as a git submodule so it can stay independent while this app pins a known-good revision.
- v1.0 established the runtime and mobile PWA baseline.
- v1.1 focused on product trust and coherence rather than adding new dashboard surface area.
- Future value is less about adding arbitrary screens and more about keeping telemetry understandable, trustworthy, and available on the devices I actually use.

## Constraints

- **Tech stack:** Keep the current Bun desktop shell, React dashboard, and Python FastAPI API unless there is a strong migration payoff.
- **Bluetooth environment:** BLE access is Windows-first and currently depends on the Node bridge plus helper tooling.
- **LAN-first access:** Mobile access should work in a browser on the local network before any remote/cloud access is considered.
- **Hardware-driven telemetry:** Runtime and charging estimates must be derived from real AC500 telemetry fields, not invented values.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep `bluetti-mqtt-node` as its own repo and consume it here as a git submodule | Preserves package independence while eliminating the copied-folder workflow | Validated in shipped runtime flow |
| Treat `bluetti-mqtt-node` as the bridge source of truth | Removes ambiguity about which component owns polling and MQTT behavior | Validated in v1.0 |
| Keep the FastAPI API in Python for now | The payoff is in monitoring reliability, not an API rewrite | Still the right call after v1.1 |
| Deliver mobile access as a LAN PWA instead of a native app | Fastest path to useful personal-first mobile access | Validated in v1.0 |
| Use v1.1 to stabilize UX before expanding feature surface | UI drift and low-trust presentation were the highest product risks | Validated in v1.1 |
| Keep the shell thin with route-owned signals | Preserves page-level framing while giving the shell one clear identity/status surface | Validated in v1.1 |
| Backfill missing verification instead of redoing shipped work | The milestone gaps were process-level, not product-level | Validated by the passing v1.1 audit |

## Archived Notes

<details>
<summary>Previous milestone planning notes</summary>

- v1.0 established the browser-first startup path, battery estimates, and LAN PWA baseline.
- v1.1 delivered shell coherence, trust-state consistency, shared UI surfaces, responsive reliability, and the formal audit trail needed to archive the milestone cleanly.

</details>

---
## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? Move to Out of Scope with reason
2. Requirements validated? Move to Validated with phase reference
3. New requirements emerged? Add to Active
4. Decisions to log? Add to Key Decisions
5. "What This Is" still accurate? Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check: still the right priority?
3. Audit Out of Scope: reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-18 after Phase 15 Estimation Accuracy implementation*
