# Phase 6: Unify Shell And Navigation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 06-unify-shell-and-navigation
**Areas discussed:** Shell hierarchy, Persistent status, Navigation model, Mobile shell behavior, Mobile route signal rule

---

## Shell hierarchy

| Option | Description | Selected |
|--------|-------------|----------|
| Thin shell | Persistent sidebar/top bar only for navigation and key status; pages own their own header content | ✓ |
| Shell-led | Persistent shell carries the main page title, status, and summary | |
| Hybrid | Shell carries compact page identity and one primary live signal; pages can still have a lighter route header | |
| You decide | Leave the exact shell structure to the agent during planning | |

**User's choice:** Thin shell
**Notes:** The goal is to stop the shell and the route hero from competing with each other.

---

## Persistent status

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal status | Connection, freshness, and maybe one battery signal | |
| Operational status | Connection, freshness, battery, device count, and notification readiness | ✓ |
| Rich status | Keep most of the current shell metrics, including input/output/net summaries | |
| You decide | Leave shell status density to the agent during planning | |

**User's choice:** Operational status
**Notes:** The shell should still be useful as a control rail, but not act like a second dashboard.

---

## Navigation model

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar stays primary | Keep sidebar as the main desktop nav with cleaned-up mobile drawer behavior | ✓ |
| Top-nav primary | Move primary navigation into the top area and reduce or remove the sidebar | |
| Split navigation | Sidebar for desktop and a separate tab-style nav for mobile | |
| You decide | Leave the navigation model to the agent during planning | |

**User's choice:** Sidebar stays primary
**Notes:** This keeps the phase aligned with the current architecture and avoids an unnecessary nav rewrite.

---

## Mobile shell behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Essential-only shell | Only the most important nav and status stay visible at the top | |
| Near-desktop parity | Keep most shell information visible on mobile too, just stacked more cleanly | |
| Mode-aware shell | Mobile shell changes by route and only shows route-relevant status in the top area | ✓ |
| You decide | Leave the mobile shell simplification to the agent during planning | |

**User's choice:** Mode-aware shell
**Notes:** Mobile should simplify intentionally instead of inheriting the full desktop shell.

---

## Mobile route signal rule

| Option | Description | Selected |
|--------|-------------|----------|
| Page identity + one key signal | Each route shows its title plus one route-relevant status item | ✓ |
| Page identity only | Mobile top shell only tells you where you are | |
| Page identity + small status cluster | Each route gets a compact 2-3 item status strip | |
| You decide | Leave the per-route rule to the agent during planning | |

**User's choice:** Page identity + one key signal
**Notes:** This keeps the mobile shell informative without letting it get crowded again.

---

## the agent's Discretion

- Exact visual execution of the thin shell
- Exact per-route signal selection on mobile
- Final wording and iconography for the shell status items

## Deferred Ideas

- No new capabilities were folded into this phase during discussion

