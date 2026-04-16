# Roadmap: Bluetti Monitor

## Overview

This roadmap completes the migration to `bluetti-mqtt-node` as the real bridge for daily monitoring, then builds upward from a stable telemetry foundation into better battery intelligence and a phone-friendly LAN PWA experience.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Complete Bridge Migration** - Replace the legacy host-poller path in setup, docs, and startup flow (completed 2026-04-03)
- [ ] **Phase 2: Harden Integration Boundaries** - Remove remaining migration residue and settle runtime ownership
- [ ] **Phase 3: Add Battery Estimates** - Derive and display time-left telemetry from live data
- [ ] **Phase 4: Ship Mobile LAN Dashboard** - Make the dashboard comfortable to use from a phone browser
- [ ] **Phase 5: Installable PWA Polish** - Package the LAN dashboard as a stable installable PWA

## Phase Details

### Phase 1: Complete Bridge Migration
**Goal**: Make `bluetti-mqtt-node` the only documented and supported bridge path for normal monitoring setup and startup.
**Depends on**: Nothing (first phase)
**Requirements**: [MIGR-01, MIGR-02]
**Success Criteria** (what must be TRUE):
  1. User can follow setup and startup instructions without encountering references to the old Python host poller.
  2. User can launch the monitor with `bluetti-mqtt-node` as the active BLE and MQTT bridge.
  3. User sees one consistent bridge story across docs, scripts, and the app bootstrap flow.
**Plans**: 3 plans

Plans:
- [x] 01-01: Audit and remove legacy host-poller references from docs, scripts, and setup guidance
- [x] 01-02: Align desktop startup flow and developer commands around `bluetti-mqtt-node`
- [x] 01-03: Verify the new migration path with a repeatable local smoke test

### Phase 2: Harden Integration Boundaries
**Goal**: Remove leftover legacy coupling, fix the remaining `bluetti-mqtt-node` migration bugs, and clarify ownership between components.
**Depends on**: Phase 1
**Requirements**: [MIGR-03, INTG-01, INTG-02, INTG-03]
**Success Criteria** (what must be TRUE):
  1. User can run the monitor without carrying old Python poller dependencies or dead integration paths.
  2. User gets reliable live telemetry from normal startup through steady-state monitoring.
  3. The desktop shell, Node bridge, and Python API each own one clear part of the runtime flow.
  4. Migration regressions are covered by tests or repeatable verification steps.
**Plans**: 3 plans

Plans:
- [x] 02-01: Remove remaining legacy Python poller dependencies and dead integration code
- [ ] 02-02: Fix bridge startup, polling, and runtime bugs needed for daily use
- [ ] 02-03: Add regression checks and document the final architecture boundaries

### Phase 3: Add Battery Estimates
**Goal**: Turn live telemetry into useful runtime and charging estimates inside the dashboard.
**Depends on**: Phase 2
**Requirements**: [BATT-01, BATT-02, BATT-03]
**Success Criteria** (what must be TRUE):
  1. User can see estimated runtime remaining from the current battery state and live power draw.
  2. User can see estimated time to full charge while the system is charging.
  3. Estimates update with live telemetry and clearly explain when data is insufficient.
**Plans**: 3 plans

Plans:
- [ ] 03-01: Define estimate inputs and derived-metric logic from available telemetry
- [ ] 03-02: Expose derived estimates to the dashboard data flow
- [ ] 03-03: Present runtime and charge estimates clearly in the UI with edge-case handling

### Phase 4: Ship Mobile LAN Dashboard
**Goal**: Make the existing dashboard genuinely usable from a phone browser on the local network.
**Depends on**: Phase 3
**Requirements**: [PWA-01, PWA-03]
**Success Criteria** (what must be TRUE):
  1. User can open the dashboard on a phone over the LAN and read the core monitoring data without desktop-only layout problems.
  2. User can navigate overview, charts, and raw data from a small screen.
  3. Core monitoring actions and information remain legible and responsive on mobile-sized layouts.
**Plans**: 2 plans

Plans:
- [ ] 04-01: Adapt layout, navigation, and information density for phone-sized screens
- [ ] 04-02: Verify LAN phone-browser usability across the core monitoring views

### Phase 5: Installable PWA Polish
**Goal**: Package the dashboard as an installable LAN PWA without disrupting the live monitoring experience.
**Depends on**: Phase 4
**Requirements**: [PWA-02]
**Success Criteria** (what must be TRUE):
  1. User can install the dashboard as a PWA from a supported mobile browser.
  2. The installed PWA opens into the monitoring experience reliably on the local network.
  3. Manifest, icons, and caching behavior do not break live monitoring or dashboard updates.
**Plans**: 2 plans

Plans:
- [ ] 05-01: Add manifest, icons, and installability support for the dashboard
- [ ] 05-02: Validate installed-PWA behavior, update flow, and LAN usage expectations

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Complete Bridge Migration | 3/3 | Complete    | 2026-04-03 |
| 2. Harden Integration Boundaries | 0/3 | Not started | - |
| 3. Add Battery Estimates | 0/3 | Not started | - |
| 4. Ship Mobile LAN Dashboard | 0/2 | Not started | - |
| 5. Installable PWA Polish | 0/2 | Not started | - |
