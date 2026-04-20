# Bluetti Monitor

## What This Is

Bluetti Monitor is a personal-first monitoring stack for a Bluetti AC500 that combines a local desktop shell, a web dashboard, and a telemetry pipeline backed by MQTT and FastAPI. It is meant to give me a reliable, understandable view of power, battery, and device state from my desktop today, while growing into something I can also use easily from my phone on my local network.

## Core Value

I can reliably see the current state of my Bluetti system in one place without fighting brittle setup, unclear ownership between components, or hard-to-interpret telemetry.

## Requirements

### Validated

- ✓ Live Bluetti telemetry flows into the dashboard through MQTT, FastAPI, and the React UI — existing
- ✓ Historical readings are stored in SQLite and exposed through REST endpoints — existing
- ✓ The dashboard already provides overview, charts, and raw-data views for current telemetry — existing
- ✓ The desktop shell can orchestrate the local monitoring stack and load the dashboard in a native window — existing
- ✓ `bluetti-mqtt-node` now owns the documented daily-use bridge path through the root `monitor:start` and `monitor:verify` commands — validated in Phase 1
- ✓ No legacy Python poller code remains; bridge startup and runtime verified; architecture boundaries documented with Component Ownership table — validated in Phase 2
- ✓ Battery estimates now show runtime remaining on current charge and time to full charge while charging, with color coding by battery level — validated in Phase 3
- ✓ Mobile PWA: dashboard works on phone browsers, sidebar drawer, responsive layout, installable as PWA — validated in Phases 4-5 (v1.0)
- ✓ Shell unified: thin top bar, centralized route registry, mobile route signals, Playwright coverage green — validated in Phase 6, with formal verification backfilled in Phase 10
- ✓ Telemetry trust states now consistently cover loading, offline, stale, and estimate-confidence behavior across the dashboard — validated in Phase 7, with formal verification and validation backfilled in Phase 11

- âœ“ Shared UI surfaces now provide consistent cards, controls, chips, spacing, and information hierarchy across the dashboard â€” validated in Phase 8, with formal verification backfilled in Phase 12

### Active

- None. v1.1 requirements are formally satisfied and the milestone is ready for re-audit.

### Out of Scope

- Push notifications and alerts — defer until the LAN PWA and battery estimate work are stable
- Remote access outside the local network — LAN-first scope for now
- Native iOS or Android app — browser and PWA access are the preferred path
- Public npm release of `bluetti-mqtt-node` — defer until the package API and architecture settle

## Context

- This project is for my own daily Bluetti monitoring first, though it should be clean enough that other Bluetti owners could use it later.
- The current stack is split across a Bun/Electrobun desktop shell in `src/`, a FastAPI API in `api/`, a React dashboard in `dashboard/`, and the `bluetti-mqtt-node` bridge in `lib/bluetti-mqtt-node/`.
- Phase 1 completed the browser-first startup migration: the repo now has canonical `monitor:start` and `monitor:verify` commands, the README no longer teaches the old manual host-poller command, and the desktop shell is clearly optional local tooling.
- The remaining migration work is now deeper than startup/docs cleanup: Phase 2 needs to remove leftover runtime coupling, settle ownership boundaries, and clean up any remaining Python-poller residue that is no longer part of the supported path.
- `bluetti-mqtt-node` is now tracked as a git submodule so it can remain its own repo while still being pinned by this app.
- Future value is not just “telemetry exists,” but “telemetry is easy to trust and useful on the devices I actually reach for,” especially my phone on the LAN.
- v1.0 proved the stack can cover the major monitoring surfaces, but the dashboard now needs a coherence pass so those surfaces feel dependable instead of partially stitched together.
- The Phase 10-12 gap-closure work is now complete, so v1.1 has formal verification coverage across shell/navigation, telemetry trust states, shared UI surfaces, and responsive reliability.

## Constraints

- **Tech stack**: Keep the current Bun desktop shell, React dashboard, and Python FastAPI API unless there is a strong migration payoff — major rewrites would slow down the actual monitoring improvements
- **Bluetooth environment**: BLE access is Windows-first and currently depends on the Node bridge plus its helper tooling — the migration must respect that runtime reality
- **LAN-first access**: Mobile access should work in a browser on the local network before any remote/cloud access is considered
- **Hardware-driven telemetry**: Runtime and charging estimates must be derived from the AC500 fields that are actually available in live telemetry, not invented from unsupported data

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep `bluetti-mqtt-node` as its own repo and consume it here as a git submodule | Preserves package independence while eliminating the copied-folder workflow | Validated during initialization |
| Treat `bluetti-mqtt-node` as the long-term source of truth for BLE and MQTT bridge behavior | The migration goal is to remove ambiguity about which component owns device polling | Validated in Phase 1 startup flow |
| Keep the FastAPI API in Python for now | The current migration is about removing the old Python poller path, not rewriting the API layer | Reaffirmed in Phase 1 |
| Three-way component ownership (desktop shell → Node bridge → Python API) is the correct boundary model | Clean separation confirmed during integration verification; documented in README Component Ownership table | Validated in Phase 2 |
| Deliver phone access as a LAN PWA instead of a native mobile app | It matches the personal-first scope and gives the fastest path to useful mobile access | Planned for Phases 4-5 |
| Defer notifications until after the migration, battery estimates, and PWA work are stable | Alerts are useful, but only after the monitoring surface is trustworthy and accessible | Deferred to later milestone work |
| Use v1.1 to stabilize the UI before expanding the dashboard further | The current dashboard has enough surface area; the bigger risk is drift, broken interactions, and low-trust presentation | Established for v1.1 planning |
| Centralized route metadata in `dashboard/src/lib/routes.ts` | Route labels, shell titles, and mobile signal labels live in one registry for consistency | Validated in Phase 6 |
| Thin persistent shell with route-specific signal chip | Page-level framing stays inside routes; shell shows route identity and one live signal | Validated in Phase 6 |
| Page-owned signal publishing with explicit reset on unmount | Routes publish their own signals; cleanup prevents stale values from lingering | Validated in Phase 6 |

## Current Milestone: v1.1 UI Cleanup And Reliability

**Goal:** Make the dashboard feel coherent, trustworthy, and finished by fixing broken or confusing UI behavior before adding more surface area.

**Target features:**
- Repair half-working or incorrect UI interactions across the dashboard
- Unify layout, hierarchy, spacing, and visual language so the app stops feeling jumbled
- Improve state handling for loading, empty, stale, and error conditions so screens behave predictably
- Tighten responsive behavior and component consistency across desktop and mobile views

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-20 after Phase 12 Phase 08 verification backfill and metadata sync*
