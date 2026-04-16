---
phase: 06
slug: unify-shell-and-navigation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-16
---

# Phase 06 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript build plus Playwright `1.58.2` |
| **Config file** | `dashboard/package.json`, `dashboard/playwright.config.ts` |
| **Quick run command** | `npm --prefix dashboard run build` |
| **Full suite command** | `npm --prefix dashboard run test:e2e` |
| **Estimated runtime** | ~35 seconds |

---

## Sampling Rate

- **After plan 06-01, 06-02, or 06-03 task commits:** Run `npm --prefix dashboard run build`
- **After plan 06-04 task commits:** Run `npm --prefix dashboard run test:e2e -- tests/dashboard.spec.ts`
- **After waves 1-3:** Run `npm --prefix dashboard run build`
- **After wave 4:** Run `npm --prefix dashboard run test:e2e`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 35 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | UI-01, UI-03 | - | One registry owns path, label, icon, shell title, and mobile signal metadata for every route | build | `npm --prefix dashboard run build` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | UI-02, UI-03 | - | Shell selectors and the route-signal store exist before the larger shell refactor begins | build | `npm --prefix dashboard run build` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 2 | UI-02 | - | Thin top bar replaces the old shell hero and keeps one route identity surface | build | `npm --prefix dashboard run build` | ✅ | ⬜ pending |
| 06-02-02 | 02 | 2 | UI-01, UI-03 | - | Desktop sidebar and mobile drawer share the same active-route treatment and responsive behavior | build | `npm --prefix dashboard run build` | ✅ | ⬜ pending |
| 06-03-01 | 03 | 3 | UI-02 | - | Overview and Charts publish the correct mobile route signal values through the shared contract | build | `npm --prefix dashboard run build` | ✅ | ⬜ pending |
| 06-03-02 | 03 | 3 | UI-01, UI-02 | - | Solar and Raw Data publish the correct mobile route signal values and reset stale values on unmount | build | `npm --prefix dashboard run build` | ✅ | ⬜ pending |
| 06-04-01 | 04 | 4 | UI-01, UI-03 | - | Drawer behavior, active-route state, and cross-route shell signals are asserted in Playwright | e2e | `npm --prefix dashboard run test:e2e -- tests/dashboard.spec.ts` | ✅ | ⬜ pending |
| 06-04-02 | 04 | 4 | UI-02 | - | Desktop layout assertions prove the route hero is gone and only one shell title remains | e2e | `npm --prefix dashboard run test:e2e -- tests/initial-layout.spec.ts` | ✅ | ⬜ pending |
| 06-04-03 | 04 | 4 | UI-01, UI-02, UI-03 | - | Full repo-local Playwright suite passes against the final shell contract | e2e | `npm --prefix dashboard run test:e2e` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/src/App.tsx` - add stable shell selectors such as `data-testid="shell-title"` and `data-testid="shell-route-signal"` before Playwright rewrite
- [ ] `dashboard/src/components/Sidebar.tsx` - add stable nav selectors such as `data-testid="sidebar-nav"` and `data-testid="sidebar-overlay"` before Playwright rewrite
- [ ] `dashboard/tests/dashboard.spec.ts` - replace stale mobile nav and charts assertions once the final shell contract lands
- [ ] `dashboard/tests/initial-layout.spec.ts` - replace duplicated-title assertions with single-shell-title and no-route-hero checks once the final shell contract lands

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Thin shell feels lighter than the page-owned hero surfaces on desktop and mobile | UI-01, UI-02 | Visual hierarchy and information competition still need a human read | Run the dashboard in mock mode, check Overview, Charts, Solar, and Raw Data at desktop and 430px widths, and confirm the shell only frames route identity while each page still owns its richer header/storytelling block |

---

## Validation Sign-Off

- [x] All tasks have automated verification or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers the selector and Playwright rewrite dependencies
- [x] No watch-mode flags
- [x] Feedback latency < 35s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
