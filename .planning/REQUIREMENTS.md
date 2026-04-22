# Requirements: Bluetti Monitor

**Defined:** 2026-04-22
**Milestone:** v1.2 Settings And Preferences
**Core Value:** I can reliably see the current state of my Bluetti system in one place without fighting brittle setup, unclear ownership between components, or hard-to-interpret telemetry.

## v1.2 Requirements

### Settings Surface

- [x] **SET-01**: User can open a dedicated settings page from the main shell navigation instead of relying on hidden or scattered controls
- [x] **SET-02**: User can understand what can be configured through clearly grouped sections such as appearance, notifications, and dashboard behavior
- [x] **SET-03**: User can tell whether a setting applies immediately, requires restart, or affects only the current device/session

### Preference Persistence

- [x] **SET-04**: User can change supported preferences and have them persist across app reloads
- [x] **SET-05**: User can reopen the app and see previously chosen settings reflected correctly in the UI
- [x] **SET-06**: User can recover from invalid, missing, or future preference data without the settings page breaking

### Runtime Behavior

- [x] **SET-07**: User can control at least the existing practical preferences already hinted at in the app, such as theme or alert behavior, from the settings page
- [x] **SET-08**: User sees setting changes apply to the relevant parts of the shell/dashboard without confusing drift between controls and actual behavior
- [x] **SET-09**: User can identify which settings are product-level defaults versus telemetry-derived live state so the page does not imply fake device control

## Future Requirements

### Alerts

- [ ] **NOTF-01**: User receives low-battery alerts
- [ ] **NOTF-02**: User receives charging-complete alerts
- [ ] **NOTF-03**: User can choose which monitoring events produce alerts

### Access

- [ ] **REMT-01**: User can securely access the dashboard outside the local network

### Packaging

- [ ] **PKG-01**: `bluetti-mqtt-node` is published to npm with installation and upgrade guidance

### Advanced Settings

- [ ] **SET-10**: User can manage more advanced runtime or bridge settings once ownership between desktop shell, API, and bridge is explicit enough to expose safely

## Out Of Scope

| Feature | Reason |
|---------|--------|
| Direct device-control toggles that pretend to change AC500 hardware state | Current milestone is about app preferences, not inventing unsupported control paths |
| Full backend settings sync or account-based preferences | The product remains personal-first and local-first |
| Remote/cloud configuration | Outside the current LAN-first product boundary |
| Reworking every existing control surface into settings in one pass | The milestone should focus on the highest-value existing preferences first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SET-01 | Phase 13 | Implemented |
| SET-02 | Phase 14 | Implemented |
| SET-03 | Phase 14 | Implemented |
| SET-04 | Phase 13 | Implemented |
| SET-05 | Phase 14 | Implemented |
| SET-06 | Phase 13 | Implemented |
| SET-07 | Phase 14 | Implemented |
| SET-08 | Phase 14 | Implemented |
| SET-09 | Phase 13 | Implemented |

**Coverage:**
- current milestone requirements: 9 total
- mapped to phases: 9
- unmapped: 0
