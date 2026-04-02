---
phase: 01
slug: complete-bridge-migration
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-02
---

# Phase 01 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright + repo-local Node smoke scripts |
| **Config file** | `dashboard/playwright.config.ts` |
| **Quick run command** | `npm run dashboard:test` |
| **Full suite command** | `npm run dashboard:test && npm run monitor:verify` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run dashboard:test`
- **After every plan wave:** Run `npm run dashboard:test && npm run monitor:verify`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | MIGR-01 | syntax | `node --check scripts/monitor/shared.mjs` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | MIGR-01 | syntax | `node --check scripts/monitor/start.mjs` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | MIGR-01 | config | `node -e "const pkg=require('./package.json'); if(!pkg.scripts['monitor:start']) process.exit(1)"` | ✅ | ⬜ pending |
| 01-02-01 | 02 | 2 | MIGR-02 | docs | `Select-String -Path README.md -Pattern "monitor:start"` | ✅ | ⬜ pending |
| 01-02-02 | 02 | 2 | MIGR-02 | config | `Select-String -Path src/bun/index.ts -Pattern "8540|5173"` | ✅ | ⬜ pending |
| 01-03-01 | 03 | 3 | MIGR-01 | syntax | `node --check scripts/monitor/verify.mjs` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 3 | MIGR-01, MIGR-02 | smoke | `npm run monitor:verify` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Existing dashboard Playwright infrastructure covers UI regressions during migration work.
- [x] `scripts/monitor/verify.mjs` is planned as the phase-specific smoke verifier for bridge/API/dashboard flow.
- [x] `package.json` will register `monitor:verify` before phase close so the full-suite command is real by the end of execution.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live device produces fresh telemetry during a real run | MIGR-01 | Requires the actual AC500 and Windows BLE environment | Run `npm run monitor:start`, confirm the command prints the dashboard URL, then confirm the dashboard/API show fresh device data after the bridge starts |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
