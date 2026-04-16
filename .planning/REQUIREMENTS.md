# Requirements: Bluetti Monitor

**Defined:** 2026-04-02
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

- [ ] **BATT-01**: User can see estimated runtime remaining at the current charge and discharge state
- [ ] **BATT-02**: User can see estimated time remaining to full charge while the system is charging
- [ ] **BATT-03**: User sees battery estimates update from live telemetry and explain when an estimate is unavailable

### Mobile PWA

- [ ] **PWA-01**: User can use the dashboard from a phone browser on the local network
- [ ] **PWA-02**: User can install the dashboard as a PWA from a supported mobile browser
- [ ] **PWA-03**: User can read and use the core monitoring views on a small-screen layout

## v2 Requirements

### Alerts

- **NOTF-01**: User receives low-battery alerts
- **NOTF-02**: User receives charging-complete alerts
- **NOTF-03**: User can choose which monitoring events produce alerts

### Access

- **REMT-01**: User can securely access the dashboard outside the local network

### Packaging

- **PKG-01**: `bluetti-mqtt-node` is published to npm with installation and upgrade guidance

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS or Android app | LAN browser and PWA access are the preferred near-term path |
| Cloud sync, accounts, or hosted remote relay | The project is personal-first and LAN-first for now |
| Push notifications in this milestone | Deferred until the migration, battery estimates, and PWA experience are stable |
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
| BATT-01 | Phase 3 | Pending |
| BATT-02 | Phase 3 | Pending |
| BATT-03 | Phase 3 | Pending |
| PWA-01 | Phase 4 | Pending |
| PWA-03 | Phase 4 | Pending |
| PWA-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-03 after Phase 1 completion*
