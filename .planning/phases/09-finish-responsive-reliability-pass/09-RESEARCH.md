# Phase 09: Finish Responsive Reliability Pass - Research

**Researched:** 2026-04-19
**Domain:** Dashboard responsive behavior, mobile interaction density, and regression coverage for phone-sized layouts
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Preserve the desktop-first information architecture from Phases 6-8, but add route-specific mobile simplifications instead of relying on generic one-column stacking.
- **D-02:** Keep the thin shell + page-owned framing model from Phase 6; responsive work should happen inside each route surface, not by reintroducing a heavy global mobile header.
- **D-03:** Prioritize readable hierarchy and stable interaction targets over showing every desktop detail at once on phones.
- **D-04:** Segmented controls, field selectors, and metric clusters should collapse intentionally on small screens, with tap-safe sizing and simplified grouping instead of overflow-prone dense rows.
- **D-05:** Charts and Solar should keep their current shared control patterns from Phase 8, but mobile may reduce simultaneous visible options or reorder them to protect readability.
- **D-06:** Raw Data should remain explorable on mobile, but search and device switching stay primary while secondary metadata can become less visually dominant.
- **D-07:** Tables, scorecards, and telemetry detail sections should adapt by changing presentation density first, not by hiding core state or introducing separate mobile-only features.
- **D-08:** When a layout cannot stay legible in its desktop form, switch to a mobile-specific representation that keeps the same underlying information contract.
- **D-09:** Existing trust-state behaviors from Phase 7 must remain intact on mobile; responsive cleanup cannot regress loading, offline, stale, or partial-state clarity.
- **D-10:** This phase should add or strengthen automated responsive checks for phone-sized layouts, especially around navigation, segmented controls, tables, and route-level signal behavior.
- **D-11:** Manual visual review is still required for polish judgments, but planning should assume responsive behavior needs concrete regression coverage rather than CSS-only confidence.

### The Agent's Discretion
- Exact breakpoint treatments and utility classes, as long as they preserve route parity and keep the mobile experience coherent with desktop.
- Which secondary metadata becomes stacked, wrapped, or visually quieter on small screens.
- Whether specific dense surfaces should become stacked cards, horizontal-scroll regions, or summary-first blocks, as long as the underlying information contract stays intact.

### Deferred Ideas (OUT OF SCOPE)
- New monitoring capabilities, telemetry sources, or route additions
- Separate mobile-only product flows or a distinct navigation model
- Backend, API, or MQTT changes unrelated to responsive dashboard reliability
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-10 | User can use the main dashboard views on a phone-sized screen without broken controls, collapsed hierarchy, or awkward overflow | Replace broad "everything becomes one column" behavior with route-specific mobile layouts, tap-safe controls, and overflow handling for raw-data surfaces |
| UI-11 | User can read tables, segmented controls, and scorecards on smaller screens through layouts that simplify intentionally instead of merely stacking | Re-group analytics controls, preserve scorecard hierarchy, and introduce explicit table/field-browser mobile behavior instead of relying on incidental wrapping |
| UI-12 | User gets a responsive experience that feels like the same product on desktop and mobile, not separate quality levels | Keep the Phase 6 shell identity and Phase 8 shared surface system intact while adapting density, order, and emphasis for phones |
</phase_requirements>

## Summary

The current dashboard is not broken on mobile so much as under-specified. `dashboard/src/index.css` already has responsive rules for `1024px` and `480px`, but those rules are mostly broad collapse rules: hide the desktop metrics, force many grids to `1fr`, stack info rows, and widen pills or buttons. That prevents total layout failure, but it does not reliably preserve hierarchy on the densest routes. Overview still carries a heavy hero + detail structure, Raw Data still depends on a horizontally scrolling table, and Charts/Solar still present multiple segmented controls and dense report surfaces that need more intentional sequencing on narrow screens.

The strongest implementation boundary is still the one created in Phases 6-8: leave the shell thin, keep route framing page-owned, and refine the shared surface system plus route-specific sections rather than introducing a separate mobile product. The responsive pass should therefore happen in three layers:

1. Tighten the shell and shared layout contract so the top bar, content gutters, card spacing, chips, and tile grids behave predictably on narrow screens.
2. Refine Overview and Raw Data, where the biggest mobile risks are information hierarchy and exploration density.
3. Refine Charts and Solar, where the biggest risks are segmented controls, scorecard pacing, and mixed chart/detail surfaces.

The existing tests do not yet prove this behavior. `dashboard/tests/dashboard.spec.ts` confirms basic drawer navigation and raw-data search at `430x932`, and `dashboard/tests/phase8-shared-ui.spec.ts` validates the shared surface system, but there is no focused phone-layout regression test that exercises route-specific responsive contracts. Phase 9 should end with that gap closed.

**Primary recommendation:** Implement Phase 9 as a four-wave pass: shared shell/layout foundations, Overview + Raw Data responsive fixes, Charts + Solar responsive fixes, then dedicated responsive Playwright coverage and final full-suite validation.

## Current Code Findings

### Shell and shared surface layer
- `dashboard/src/App.tsx` already uses a thin shell with a route title and one route-specific mobile signal, which matches the Phase 6 contract and should be preserved.
- `dashboard/src/index.css` hides `.top-bar-metrics` under `1024px`, expands `.top-bar-signal` to full width, and reduces padding on `.app-content` and `.card`, which is a good base but not enough to define route-level hierarchy.
- Shared Phase 8 primitives such as `PageHeader`, `SectionPanel`, `MetricTile`, `StatusChip`, and `.tile-grid` already exist, so Phase 9 should prefer reshaping surfaces around those instead of inventing new one-off mobile markup.

### Overview risks
- `dashboard/src/pages/Overview.tsx` still combines a hero card, a summary tile grid, multiple detail sections, a switchboard grid, and a long explanatory card.
- The CSS collapses `.hero-grid`, `.power-flow-panel`, `.summary-grid`, `.detail-grid`, and `.switchboard-grid`, but it does not explicitly reorder or prioritize the overview hierarchy for phones.
- The highest-risk content is the hero battery block, power-node split rows, and multi-panel detail section, because they can remain technically visible while still feeling crowded or visually flat.

### Raw Data risks
- `dashboard/src/pages/RawData.tsx` already has the right information priorities: device selection, search, then the field list.
- The current mobile rules widen the device-pill row and search shell, and the table wrapper already uses horizontal scroll, which is a useful fallback.
- What is still missing is a stronger mobile contract for the field browser itself: the page should feel intentionally explorable on phones, not like a desktop table merely clipped into a scroll box.

### Charts and Solar risks
- `dashboard/src/pages/Charts.tsx` and `dashboard/src/pages/Solar.tsx` already share `RANGE_PRESETS`, `useDeviceSelector`, `PageHeader`, `SectionPanel`, `MetricTile`, and `StatusChip`.
- Both pages still render multiple segmented-control groups, score grids, report meta chips, chart shells, and secondary detail cards. Existing CSS mostly collapses these grids but does not strongly sequence controls and report blocks for small screens.
- The key mobile issue is not component reuse anymore; it is pacing and ordering. The active window selector, focus selector, scorecards, primary chart, and supporting detail surfaces need a clearer narrow-screen flow.

## Recommended Architecture

### Pattern 1: Shared responsive shell contract
Use `dashboard/src/App.tsx` and the shared shell/css sections of `dashboard/src/index.css` to define the narrow-screen baseline: top-bar wrapping, signal prominence, content gutters, card padding, chip wrapping, and tile-grid defaults. This creates a stable mobile frame for every route.

### Pattern 2: Route-specific mobile hierarchy
Keep each route responsible for its own mobile layout contract:
- Overview: hero first, then a concise summary tier, then detail sections in a deliberate order
- Raw Data: controls first, then the active field browser in the most legible format available
- Charts/Solar: controls first, then scorecards, then report chart, then secondary detail surfaces

### Pattern 3: Information-contract preservation
When desktop layout patterns cannot survive on a phone, change the representation instead of hiding state. Examples:
- Split-row comparisons can become stacked label/value groups
- Dense scorecard rows can become one-column or two-column tile grids with clearer ordering
- Raw-data exploration can keep horizontal table scroll or switch to summary-first stacked rows, but must preserve access to the same field/value/category/time information

### Pattern 4: Responsive verification as a feature contract
Treat the responsive contract as testable behavior, not visual hope. Add focused Playwright coverage for phone-sized layouts that checks route navigation, segmented controls, device switching, search, visible cards, and the continued presence of route-level signal behavior.

## Anti-Patterns to Avoid

- **One-size-fits-all collapsing:** The current broad media-query overrides are useful as safety rails, but they are not enough as the phase outcome.
- **Separate mobile product logic:** Do not create a different navigation system, route inventory, or data model for phones.
- **Hiding core telemetry to make layouts fit:** Preserve the same monitoring contract even when changing representation.
- **Testing only desktop plus one smoke mobile route:** Phase 9 needs route-aware responsive regression checks.
- **Overlapping CSS edits across plans:** Because most responsive behavior lives in `dashboard/src/index.css`, serialize CSS-heavy execution plans to avoid conflicts.

## Common Pitfalls

### Pitfall 1: Mobile controls still work, but feel cramped
**What goes wrong:** Buttons and segmented controls remain clickable, but the page asks the user to interpret too many adjacent controls before they reach the main content.

**How to avoid:** Sequence controls explicitly. Put device/window/focus controls in a stable order, allow wrapping with deliberate spacing, and reduce secondary meta density before compressing the primary action row.

### Pitfall 2: Overview keeps all information but loses hierarchy
**What goes wrong:** Everything stacks into one column and becomes technically readable, yet the user can no longer quickly tell battery reserve, current mode, and power flow at a glance.

**How to avoid:** Preserve a clear hero-first hierarchy, simplify supporting labels, and avoid turning the summary tier into a visually uniform wall.

### Pitfall 3: Raw Data relies entirely on horizontal scroll
**What goes wrong:** The field table remains available, but on phones it feels like a debugging artifact instead of a usable explorer.

**How to avoid:** Keep the search and device controls prominent, ensure the table wrapper is intentional, and consider mobile-specific field-row presentation if the table stays too dense.

### Pitfall 4: Shared components are reused, but route rhythm still diverges
**What goes wrong:** Charts and Solar use the same primitives, yet one route feels coherent on mobile and the other feels haphazard because ordering and spacing differ.

**How to avoid:** Align responsive sequencing around the same narrative rhythm: controls, key metrics, primary report, secondary detail.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite, Playwright, dashboard build | Yes | `v22.18.0` | None |
| npm | Dashboard scripts | Yes | `10.9.3` | None |
| Playwright | Responsive regression coverage | Yes | repo-local via `dashboard/package.json` | Use targeted single-spec runs before full suite |
| Vite | Dashboard dev server for Playwright | Yes | via repo-local scripts | None |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | TypeScript build plus Playwright |
| Config file | `dashboard/package.json`, `dashboard/playwright.config.ts` |
| Quick run command | `npm --prefix dashboard run build` |
| Full suite command | `npm --prefix dashboard run test:e2e` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-10 | Main routes stay usable on a phone-sized screen without broken controls or overflow | e2e | `npm --prefix dashboard run test:e2e -- tests/phase9-responsive.spec.ts` | No |
| UI-11 | Tables, segmented controls, and scorecards simplify intentionally on smaller screens | e2e | `npm --prefix dashboard run test:e2e -- tests/phase9-responsive.spec.ts` | No |
| UI-12 | Mobile still feels like the same product and preserves Phase 6-8 contracts | e2e + build | `npm --prefix dashboard run test:e2e` | Partial |

### Sampling Rate
- After shared-layout and route-layout commits: run `npm --prefix dashboard run build`
- After responsive test work: run `npm --prefix dashboard run test:e2e -- tests/phase9-responsive.spec.ts`
- Before verification: run `npm --prefix dashboard run test:e2e`

### Wave 0 Gaps
- [ ] Add a dedicated responsive regression spec such as `dashboard/tests/phase9-responsive.spec.ts`
- [ ] Add any stable selectors needed for mobile-only assertions, but prefer existing `data-testid` values first
- [ ] Confirm the raw-data mobile contract can be asserted without brittle screenshot-only checks

## Sources

### Primary (HIGH confidence)
- Local codebase inspection:
  - `dashboard/src/App.tsx`
  - `dashboard/src/index.css`
  - `dashboard/src/pages/Overview.tsx`
  - `dashboard/src/pages/RawData.tsx`
  - `dashboard/src/pages/Charts.tsx`
  - `dashboard/src/pages/Solar.tsx`
  - `dashboard/src/lib/routes.ts`
  - `dashboard/src/lib/shared-controls.ts`
  - `dashboard/tests/dashboard.spec.ts`
  - `dashboard/tests/initial-layout.spec.ts`
  - `dashboard/tests/phase8-shared-ui.spec.ts`

### Secondary (MEDIUM confidence)
- Prior planning artifacts:
  - `.planning/phases/06-unify-shell-and-navigation/06-CONTEXT.md`
  - `.planning/phases/07-fix-telemetry-trust-states/07-CONTEXT.md`
  - `.planning/phases/08-consolidate-shared-ui-surfaces/08-VALIDATION.md`

## Metadata

**Confidence breakdown:**
- Current implementation analysis: HIGH - based on direct code and CSS inspection
- Plan shape and dependency ordering: HIGH - driven by current file ownership, especially `dashboard/src/index.css`
- Responsive verification gap assessment: HIGH - confirmed by current test coverage

**Research date:** 2026-04-19
**Valid until:** 2026-05-19
