---
phase: 08
slug: consolidate-shared-ui-surfaces
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-17T15:42:26.9641389-07:00
---

# Phase 08 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright |
| **Config file** | `dashboard/playwright.config.ts` |
| **Quick run command** | `cd dashboard && npx playwright test tests/phase8-shared-ui.spec.ts` |
| **Full suite command** | `cd dashboard && npm run test:e2e` |
| **Estimated runtime** | ~8 seconds for the phase-specific regression spec |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx playwright test tests/phase8-shared-ui.spec.ts`
- **After every plan wave:** Run `cd dashboard && npm run test:e2e`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | UI-07 | T-08-01 / T-08-02 | Shared UI primitives render consistently without introducing new privileged behavior or secret-bearing surfaces. | e2e | `cd dashboard && npx playwright test tests/phase8-shared-ui.spec.ts` | ✅ `dashboard/tests/phase8-shared-ui.spec.ts` | ✅ green |
| 08-02-01 | 02 | 2 | UI-08 | T-08-03 | Overview and Raw Data reuse shared surfaces while preserving readable hierarchy, spacing, chips, and field browsing behavior. | e2e | `cd dashboard && npx playwright test tests/phase8-shared-ui.spec.ts` | ✅ `dashboard/tests/phase8-shared-ui.spec.ts` | ✅ green |
| 08-03-01 | 03 | 2 | UI-09 | T-08-04 / T-08-05 | Charts and Solar share controls and surfaces, and route-specific interactions still update the visible analytics/report state correctly. | e2e | `cd dashboard && npx playwright test tests/phase8-shared-ui.spec.ts` | ✅ `dashboard/tests/phase8-shared-ui.spec.ts` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| High-fidelity visual polish review across all four pages | UI-08 | Visual cohesion and “finished feel” still require human judgment beyond DOM assertions. | Use `$gsd-ui-review 08` or manually inspect Overview, Raw Data, Charts, and Solar in desktop and mobile mock mode. |

---

## Validation Audit 2026-04-17

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

Gap resolved by adding `dashboard/tests/phase8-shared-ui.spec.ts`, which verifies shared surfaces on Overview/Raw Data and shared control behavior on Charts/Solar in mock mode.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-17
