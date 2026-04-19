# Phase 09: finish-responsive-reliability-pass - Context

**Gathered:** 2026-04-19 (auto via `$gsd-next` -> `$gsd-discuss-phase 09 --auto`)
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the existing dashboard routes feel intentionally usable on phone-sized screens by simplifying layouts, controls, and dense data surfaces without adding new monitoring capabilities. This phase is about responsive reliability for Overview, Charts, Solar, and Raw Data, not about expanding what the app can do.

</domain>

<decisions>
## Implementation Decisions

### Mobile layout strategy
- **D-01:** Preserve the desktop-first information architecture from Phases 6-8, but add route-specific mobile simplifications instead of relying on generic one-column stacking.
- **D-02:** Keep the thin shell + page-owned framing model from Phase 6; responsive work should happen inside each route surface, not by reintroducing a heavy global mobile header.
- **D-03:** Prioritize readable hierarchy and stable interaction targets over showing every desktop detail at once on phones.

### Dense control handling
- **D-04:** Segmented controls, field selectors, and metric clusters should collapse intentionally on small screens, with tap-safe sizing and simplified grouping instead of overflow-prone dense rows.
- **D-05:** Charts and Solar should keep their current shared control patterns from Phase 8, but mobile may reduce simultaneous visible options or reorder them to protect readability.
- **D-06:** Raw Data should remain explorable on mobile, but search and device switching stay primary while secondary metadata can become less visually dominant.

### Data surface simplification
- **D-07:** Tables, scorecards, and telemetry detail sections should adapt by changing presentation density first, not by hiding core state or introducing separate mobile-only features.
- **D-08:** When a layout cannot stay legible in its desktop form, switch to a mobile-specific representation that keeps the same underlying information contract.
- **D-09:** Existing trust-state behaviors from Phase 7 must remain intact on mobile; responsive cleanup cannot regress loading, offline, stale, or partial-state clarity.

### Verification emphasis
- **D-10:** This phase should add or strengthen automated responsive checks for phone-sized layouts, especially around navigation, segmented controls, tables, and route-level signal behavior.
- **D-11:** Manual visual review is still required for polish judgments, but planning should assume responsive behavior needs concrete regression coverage rather than CSS-only confidence.

### the agent's Discretion
- Exact breakpoint-specific layout treatments, as long as they preserve route parity and avoid introducing separate mobile product logic.
- Which secondary metadata becomes collapsible or visually quieter on phone screens.
- Whether specific dense surfaces are better served by stacked cards, horizontal scroll wrappers, or alternate summary-first mobile views.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` - Phase 9 goal, requirements, and success criteria
- `.planning/REQUIREMENTS.md` - UI-10, UI-11, and UI-12 definitions and milestone traceability
- `.planning/PROJECT.md` - v1.1 milestone goal and LAN-first/mobile-use project constraints
- `.planning/STATE.md` - current milestone state, noting that phase metadata is behind the actual artifact state

### Prior phase decisions that constrain this phase
- `.planning/phases/06-unify-shell-and-navigation/06-CONTEXT.md` - shell hierarchy, sidebar/drawer navigation, and route-signal rules that mobile responsive work must preserve
- `.planning/phases/07-fix-telemetry-trust-states/07-CONTEXT.md` - loading/offline/stale-state rules that must survive responsive changes
- `.planning/phases/08-consolidate-shared-ui-surfaces/08-VALIDATION.md` - shared surface and control coverage already established for Phase 8

### Current implementation and responsive behavior
- `dashboard/src/App.tsx` - shell, route rendering, top-bar signal behavior, and mobile drawer setup
- `dashboard/src/lib/routes.ts` - centralized route metadata and mobile signal labels
- `dashboard/src/index.css` - current breakpoints, route layout rules, shared surface tokens, and existing responsive collapse behavior
- `dashboard/src/pages/Overview.tsx` - densest overview layout and power-flow/mobile hierarchy candidate
- `dashboard/src/pages/Charts.tsx` - segmented controls, score tiles, and analytics workspace patterns
- `dashboard/src/pages/Solar.tsx` - solar-specific scorecards, detail grids, and mapping sections on small screens
- `dashboard/src/pages/RawData.tsx` - searchable field explorer and table behavior on mobile

### Current verification baseline
- `dashboard/tests/dashboard.spec.ts` - current desktop/mobile navigation and route smoke coverage
- `dashboard/tests/initial-layout.spec.ts` - layout stability baseline
- `dashboard/tests/phase8-shared-ui.spec.ts` - shared surface/control regression checks that Phase 9 must preserve

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dashboard/src/App.tsx`: already centralizes shell-level route identity, mobile drawer behavior, and route-signal publishing.
- `dashboard/src/lib/routes.ts`: route metadata is already centralized, which makes route-specific responsive behavior easier to coordinate without duplicating labels and signals.
- `dashboard/src/components/ui.tsx` and the shared components introduced in Phase 8: cards, headers, chips, tiles, and panels give Phase 9 a shared surface layer to refine instead of route-by-route ad hoc styling.
- `dashboard/src/hooks/useTelemetryState.ts`: trust-state classification is already shared, so responsive changes can preserve consistent loading/offline/stale behavior.
- Playwright infrastructure in `dashboard/playwright.config.ts` and `dashboard/tests/*.spec.ts`: existing mobile viewport testing can be extended instead of introducing a new test stack.

### Established Patterns
- The shell is intentionally thin, with route-level pages owning their own content framing.
- Mobile already uses a drawer sidebar rather than a separate navigation system.
- Responsive CSS currently relies heavily on broad breakpoint overrides in `dashboard/src/index.css`, often collapsing complex layouts to single-column grids.
- Charts and Solar share segmented-control and scorecard patterns from Phase 8, while Raw Data remains table-centric and Overview remains the most dashboard-like route.

### Integration Points
- Shell-level responsive changes should stay in `dashboard/src/App.tsx` and shared shell sections of `dashboard/src/index.css`.
- Route-level responsive fixes will likely concentrate in `dashboard/src/pages/*.tsx` plus the route-specific CSS clusters in `dashboard/src/index.css`.
- Verification changes should land in `dashboard/tests/` so responsive regressions are covered in mock mode.

</code_context>

<specifics>
## Specific Ideas

- Phase 9 should make mobile feel like the same product as desktop, not a stacked fallback version.
- The highest-risk surfaces are the segmented analytics controls, dense metric grids, raw data table explorer, and the overview power-flow hierarchy.
- Responsive cleanup should bias toward fewer simultaneous choices on phones, clearer grouping, and preserving the most decision-useful telemetry first.

</specifics>

<deferred>
## Deferred Ideas

None - the auto discussion stayed within the Phase 9 responsive reliability scope.

</deferred>

---

*Phase: 09-finish-responsive-reliability-pass*
*Context gathered: 2026-04-19*
