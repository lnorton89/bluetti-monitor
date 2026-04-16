# Phase 2: Harden Integration Boundaries - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 02-harden-integration-boundaries
**Areas discussed:** MIGR-03 completion, bridge bugs, runtime boundaries, regression checks

---

## Auto-Selected Gray Areas

### MIGR-03: Legacy Removal
| Option | Description | Selected |
|--------|-------------|----------|
| Verify no legacy code remains | Scan codebase for Python poller references | ✓ (auto-selected) |

**User's choice:** (auto) Verified no legacy Python poller code in TypeScript or Python source files. Only documentation references exist.

### Bridge Bugs
| Option | Description | Selected |
|--------|-------------|----------|
| Fix startup/polling/runtime bugs | Primary work is fixing bridge bugs for daily reliability | ✓ (auto-selected) |

**User's choice:** (auto) Focus on bridge startup, polling, and runtime bugs for daily use.

### Runtime Boundaries
| Option | Description | Selected |
|--------|-------------|----------|
| Confirm clear ownership | Desktop shell → Node bridge → Python API clear boundaries | ✓ (auto-selected) |

**User's choice:** (auto) Confirmed clear three-way ownership already exists.

### Regression Checks
| Option | Description | Selected |
|--------|-------------|----------|
| Validate monitor:verify | Use existing command as primary regression check | ✓ (auto-selected) |

**User's choice:** (auto) Use `npm run monitor:verify` as the primary regression check.

---

## Claude's Discretion

- Specific bridge bugs to fix (identified during execution)
- Exact shape of additional regression checks (if needed)