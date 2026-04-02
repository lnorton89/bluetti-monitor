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

### Active

- [ ] `bluetti-mqtt-node` fully replaces the old host poller path across setup, docs, startup flow, and dependencies
- [ ] Remaining migration bugs and architecture gaps between the desktop shell, the Node bridge, and the Python API are resolved
- [ ] The dashboard calculates runtime remaining on the current charge level and time remaining to full charge while charging
- [ ] The dashboard becomes phone-friendly and installable as a LAN PWA

### Out of Scope

- Push notifications and alerts — defer until the LAN PWA and battery estimate work are stable
- Remote access outside the local network — LAN-first scope for now
- Native iOS or Android app — browser and PWA access are the preferred path
- Public npm release of `bluetti-mqtt-node` — defer until the package API and architecture settle

## Context

- This project is for my own daily Bluetti monitoring first, though it should be clean enough that other Bluetti owners could use it later.
- The current stack is split across a Bun/Electrobun desktop shell in `src/`, a FastAPI API in `api/`, a React dashboard in `dashboard/`, and the `bluetti-mqtt-node` bridge in `lib/bluetti-mqtt-node/`.
- The repo is in the middle of a migration away from an older Python-based host poller path. Some docs and setup assumptions still refer to that earlier approach, and the move to `bluetti-mqtt-node` is not fully finished.
- `bluetti-mqtt-node` is now tracked as a git submodule so it can remain its own repo while still being pinned by this app.
- Future value is not just “telemetry exists,” but “telemetry is easy to trust and useful on the devices I actually reach for,” especially my phone on the LAN.

## Constraints

- **Tech stack**: Keep the current Bun desktop shell, React dashboard, and Python FastAPI API unless there is a strong migration payoff — major rewrites would slow down the actual monitoring improvements
- **Bluetooth environment**: BLE access is Windows-first and currently depends on the Node bridge plus its helper tooling — the migration must respect that runtime reality
- **LAN-first access**: Mobile access should work in a browser on the local network before any remote/cloud access is considered
- **Hardware-driven telemetry**: Runtime and charging estimates must be derived from the AC500 fields that are actually available in live telemetry, not invented from unsupported data

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep `bluetti-mqtt-node` as its own repo and consume it here as a git submodule | Preserves package independence while eliminating the copied-folder workflow | — Pending |
| Treat `bluetti-mqtt-node` as the long-term source of truth for BLE and MQTT bridge behavior | The migration goal is to remove ambiguity about which component owns device polling | — Pending |
| Keep the FastAPI API in Python for now | The current migration is about removing the old Python poller path, not rewriting the API layer | — Pending |
| Deliver phone access as a LAN PWA instead of a native mobile app | It matches the personal-first scope and gives the fastest path to useful mobile access | — Pending |
| Defer notifications until after the migration, battery estimates, and PWA work are stable | Alerts are useful, but only after the monitoring surface is trustworthy and accessible | — Pending |

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
*Last updated: 2026-04-02 after initialization*
