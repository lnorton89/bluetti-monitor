# Phase 09: finish-responsive-reliability-pass - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the auto-selected assumptions and rationale.

**Date:** 2026-04-19
**Phase:** 09-finish-responsive-reliability-pass
**Areas discussed:** Mobile layout strategy, Dense control handling, Data surface simplification, Verification emphasis

---

## Mobile layout strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Route-specific simplification | Keep the current product structure but design mobile-specific simplifications per route instead of global stacking | ✓ |
| Generic one-column collapse | Let all dense surfaces collapse the same way at breakpoints | |
| Separate mobile route variants | Introduce substantially different route structures for phones | |

**User's choice:** `[auto] Route-specific simplification`
**Notes:** Selected from prior evidence in Phase 6 shell decisions, current route-specific page framing, and existing broad CSS breakpoint overrides in `dashboard/src/index.css`.

---

## Dense control handling

| Option | Description | Selected |
|--------|-------------|----------|
| Simplify and re-group controls on phones | Preserve control behavior but reduce simultaneous density and improve tap sizing | ✓ |
| Keep all desktop controls visible as-is | Preserve complete parity even when mobile becomes crowded | |
| Hide advanced controls entirely on mobile | Remove dense interactions rather than adapt them | |

**User's choice:** `[auto] Simplify and re-group controls on phones`
**Notes:** Chosen because Charts and Solar already share controls from Phase 8, and the responsive requirement is intentional simplification rather than feature reduction.

---

## Data surface simplification

| Option | Description | Selected |
|--------|-------------|----------|
| Adapt presentation, preserve information contract | Keep the same data available but change layout/density when needed | ✓ |
| Hide lower-priority data on mobile | Drop significant detail for cleaner screens | |
| Leave dense desktop surfaces scroll-heavy | Accept awkward overflow instead of redesigning surfaces | |

**User's choice:** `[auto] Adapt presentation, preserve information contract`
**Notes:** Selected to align with UI-10 through UI-12 and the product goal of trustworthy monitoring on phone-sized screens.

---

## Verification emphasis

| Option | Description | Selected |
|--------|-------------|----------|
| Add responsive regression coverage | Expand automated checks around mobile layouts and controls | ✓ |
| Rely mostly on manual visual review | Use human checks as the main safety net | |
| Treat CSS changes as low-risk | Make layout changes with minimal verification additions | |

**User's choice:** `[auto] Add responsive regression coverage`
**Notes:** Chosen because the repo already has Playwright mobile coverage and Phase 8 validation showed focused specs are practical for UI reliability work.

---

## Auto-Resolved

- Mobile layout strategy: auto-selected route-specific simplification as the recommended default.
- Dense control handling: auto-selected simplified mobile grouping instead of full-density parity.
- Data surface simplification: auto-selected presentation adaptation instead of information removal.
- Verification emphasis: auto-selected stronger responsive regression coverage.

## Deferred Ideas

None.
