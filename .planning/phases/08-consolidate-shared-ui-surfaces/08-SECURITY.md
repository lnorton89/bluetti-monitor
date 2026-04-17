---
phase: 08
slug: consolidate-shared-ui-surfaces
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-17T14:46:47.0294202-07:00
---

# Phase 08 - Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Internal UI only | Shared dashboard components, page headers, tiles, chips, and local selection helpers render already-available local telemetry and static configuration data inside the app shell. | Device labels, telemetry values, and static range preset metadata. No secrets or privileged actions cross this boundary. |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-08-01 | Elevation | Shared components | accept | Internal UI library only; no privilege boundary or action escalation path introduced. | closed |
| T-08-02 | Info disclosure | StatusChip values | accept | StatusChip renders existing telemetry labels/values only; no secrets or new data exposure path added. | closed |
| T-08-03 | Tampering | Shared component props | accept | Props remain local React inputs with no mutable cross-boundary trust handoff. | closed |
| T-08-04 | Tampering | useDeviceSelector | accept | Hook manages only local UI selection state and does not accept external commands or persisted writes. | closed |
| T-08-05 | Info disclosure | RANGE_PRESETS | accept | Presets are static client-side configuration values with no sensitive content. | closed |

*Status: open · closed*  
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-08-01 | T-08-01 | Phase 08 only extracted and reused presentational UI primitives; it did not introduce any privileged workflow or capability boundary. | Codex security audit | 2026-04-17 |
| AR-08-02 | T-08-02 | Telemetry displayed in StatusChip is the same non-secret device state already visible elsewhere in the dashboard. | Codex security audit | 2026-04-17 |
| AR-08-03 | T-08-03 | Shared component props are in-process React values, not externally trusted input crossing to a more privileged layer. | Codex security audit | 2026-04-17 |
| AR-08-04 | T-08-04 | `useDeviceSelector` only switches between already-loaded local devices and does not mutate device state. | Codex security audit | 2026-04-17 |
| AR-08-05 | T-08-05 | `RANGE_PRESETS` contains fixed window metadata only and cannot leak credentials or protected data. | Codex security audit | 2026-04-17 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-17 | 5 | 5 | 0 | Codex (`$gsd-secure-phase 08`) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-17
