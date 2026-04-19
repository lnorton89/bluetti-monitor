---
phase: 09
slug: finish-responsive-reliability-pass
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-19
---

# Phase 09 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript build plus Playwright |
| **Config file** | `dashboard/package.json`, `dashboard/playwright.config.ts` |
| **Quick run command** | `npm --prefix dashboard run build` |
| **Full suite command** | `npm --prefix dashboard run test:e2e` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After plan 09-01, 09-02, or 09-03 task commits:** Run `npm --prefix dashboard run build`
- **After plan 09-04 task commits:** Run `npm --prefix dashboard run test:e2e -- tests/phase9-responsive.spec.ts`
- **After every wave:** Run the wave's listed verification command before continuing
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | UI-10, UI-12 | - | Shell title, route signal, gutters, cards, and chip wrapping stay usable at phone widths without reintroducing a heavy mobile header | build | `npm --prefix dashboard run build` | Yes | pending |
| 09-01-02 | 01 | 1 | UI-10, UI-11 | - | Shared responsive token updates keep top-bar, tile-grid, and control wrappers stable on narrow screens | build | `npm --prefix dashboard run build` | Yes | pending |
| 09-02-01 | 02 | 2 | UI-10, UI-11 | - | Overview preserves readable hero, summary, and detail hierarchy on phones while keeping trust-state surfaces | build | `npm --prefix dashboard run build` | Yes | pending |
| 09-02-02 | 02 | 2 | UI-10, UI-11 | - | Raw Data keeps device switching, search, and field browsing usable on phones without losing the live field contract | build | `npm --prefix dashboard run build` | Yes | pending |
| 09-03-01 | 03 | 3 | UI-10, UI-11 | - | Charts controls, scorecards, and report surfaces keep readable mobile sequencing | build | `npm --prefix dashboard run build` | Yes | pending |
| 09-03-02 | 03 | 3 | UI-10, UI-11, UI-12 | - | Solar controls, scorecards, and mapping/detail surfaces keep readable mobile sequencing and shared-product feel | build | `npm --prefix dashboard run build` | Yes | pending |
| 09-04-01 | 04 | 4 | UI-10, UI-11 | - | New responsive Playwright coverage proves phone-sized navigation and route-level responsive behavior across all main routes | e2e | `npm --prefix dashboard run test:e2e -- tests/phase9-responsive.spec.ts` | No - Wave 4 | pending |
| 09-04-02 | 04 | 4 | UI-12 | - | Existing smoke and shared-surface suites stay green after responsive changes | e2e | `npm --prefix dashboard run test:e2e` | Yes | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/tests/phase9-responsive.spec.ts` - add a dedicated responsive regression spec for phone-sized layouts
- [ ] Add any missing selectors only where existing `data-testid`, labels, or stable route content are insufficient for mobile assertions
- [ ] Confirm `dashboard/playwright.config.ts` still serves mock mode consistently for the new responsive test flow

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile still feels like the same product as desktop rather than a degraded fallback | UI-12 | Visual hierarchy, pacing, and polish still need a human judgment | Run the dashboard in mock mode at approximately `390x844` and `430x932`, check Overview, Charts, Solar, and Raw Data, and confirm the shell, page headers, scorecards, controls, and empty/offline states still feel like one coherent dashboard |

---

## Validation Sign-Off

- [x] All tasks have automated verification or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers the new responsive Playwright dependency
- [x] No watch-mode flags
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
