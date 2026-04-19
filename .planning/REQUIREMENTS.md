# Requirements: Bluetti Monitor

**Defined:** 2026-04-16
**Core Value:** I can reliably see the current state of my Bluetti system in one place without fighting brittle setup, unclear ownership between components, or hard-to-interpret telemetry.

## v1 Requirements

### Migration

- [x] **MIGR-01**: User can start the monitor with `bluetti-mqtt-node` as the only BLE and MQTT bridge in the daily-use monitoring flow
- [x] **MIGR-02**: User can follow repo setup steps, docs, and developer commands without encountering references to the old Python host poller
- [x] **MIGR-03**: Legacy Python poller dependencies and integration code are removed from the app repo, except for the FastAPI API service itself

### Integration

- [x] **INTG-01**: User gets reliable live AC500 monitoring from the `bluetti-mqtt-node` bridge during normal startup and steady-state polling
- [x] **INTG-02**: User benefits from a clear runtime boundary where the desktop shell, Node bridge, and Python API do not duplicate BLE or MQTT responsibilities
- [x] **INTG-03**: User can verify the migration path with tests or repeatable checks that cover startup and live telemetry flow

### Battery Estimates

- [x] **BATT-01**: User can see estimated runtime remaining at the current charge and discharge state — v1.0
- [x] **BATT-02**: User can see estimated time remaining to full charge while the system is charging — v1.0
- [x] **BATT-03**: User sees battery estimates update from live telemetry and explain when an estimate is unavailable — v1.0

### Mobile PWA

- [x] **PWA-01**: User can use the dashboard from a phone browser on the local network — v1.0
- [x] **PWA-02**: User can install the dashboard as a PWA from a supported mobile browser — v1.0
- [x] **PWA-03**: User can read and use the core monitoring views on a small-screen layout — v1.0

## v1.1 Requirements

### Shell And Navigation

- [ ] **UI-01**: User can move between overview, charts, solar, and raw-data views through a shell that has consistent hierarchy and does not feel visually jumbled
- [ ] **UI-02**: User can tell what page they are on and what the most important live status is without duplicated or competing header signals
- [ ] **UI-03**: User can use sidebar and top-bar navigation reliably on desktop and mobile layouts

### Telemetry Trust And State Handling

- [ ] **UI-04**: User can distinguish loading, empty, offline, stale, and partially available telemetry states across the dashboard
- [ ] **UI-05**: User sees live telemetry summaries that behave correctly when values are missing, delayed, or derived from fallback logic
- [ ] **UI-06**: User can trust that the overview, charts, solar, and raw-data pages present state in a consistent and understandable way

### Shared UI System

- [ ] **UI-07**: User experiences consistent cards, controls, chips, scoreboards, and table/list surfaces across dashboard pages
- [ ] **UI-08**: User sees cleaner spacing, typography, and information density that make the app feel finished rather than stitched together
- [ ] **UI-09**: User benefits from reused UI patterns instead of route-specific one-off components that drift visually or behaviorally

### Responsive Reliability

- [x] **UI-10**: User can use the main dashboard views on a phone-sized screen without broken controls, collapsed hierarchy, or awkward overflow
- [x] **UI-11**: User can read tables, segmented controls, and scorecards on smaller screens through layouts that simplify intentionally instead of merely stacking
- [x] **UI-12**: User gets a responsive experience that feels like the same product on desktop and mobile, not separate quality levels

## Future Requirements

### Alerts

- [ ] **NOTF-01**: User receives low-battery alerts
- [ ] **NOTF-02**: User receives charging-complete alerts
- [ ] **NOTF-03**: User can choose which monitoring events produce alerts

### Access

- [ ] **REMT-01**: User can securely access the dashboard outside the local network

### Packaging

- [ ] **PKG-01**: `bluetti-mqtt-node` is published to npm with installation and upgrade guidance

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS or Android app | LAN browser and PWA access are the preferred near-term path |
| Cloud sync, accounts, or hosted remote relay | The project is personal-first and LAN-first for now |
| New dashboard feature expansion in this milestone | UI coherence and reliability are a higher priority than adding more surfaces right now |
| Remote access in this milestone | UI stabilization is the current focus and LAN-first is still the project boundary |
| Full rewrite of the Python API layer | Not required to finish the current bridge migration and monitoring goals |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MIGR-01 | Phase 1 | Complete (2026-04-03) |
| MIGR-02 | Phase 1 | Complete (2026-04-03) |
| MIGR-03 | Phase 2 | Complete |
| INTG-01 | Phase 2 | Complete |
| INTG-02 | Phase 2 | Complete |
| INTG-03 | Phase 2 | Complete |
| BATT-01 | Phase 3 | Complete |
| BATT-02 | Phase 3 | Complete |
| BATT-03 | Phase 3 | Complete |
| PWA-01 | Phase 4 | Complete |
| PWA-03 | Phase 4 | Complete |
| PWA-02 | Phase 5 | Complete |
| UI-01 | Phase 6 | Planned |
| UI-02 | Phase 6 | Planned |
| UI-03 | Phase 6 | Planned |
| UI-04 | Phase 7 | Planned |
| UI-05 | Phase 7 | Planned |
| UI-06 | Phase 7 | Planned |
| UI-07 | Phase 8 | Planned |
| UI-08 | Phase 8 | Planned |
| UI-09 | Phase 8 | Planned |
| UI-10 | Phase 9 | Complete |
| UI-11 | Phase 9 | Complete |
| UI-12 | Phase 9 | Complete |

**Coverage:**
- shipped requirements: 12 total
- current milestone requirements: 12 total
- mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-16*
*Last updated: 2026-04-16 for milestone v1.1 planning*
