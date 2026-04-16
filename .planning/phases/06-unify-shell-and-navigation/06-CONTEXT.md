# Phase 6: Unify Shell And Navigation - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the dashboard shell coherent so route identity, primary status, and navigation behave consistently across desktop and mobile. This phase is about the persistent frame around the pages, not about adding new dashboard capabilities.

</domain>

<decisions>
## Implementation Decisions

### Shell hierarchy
- **D-01:** Use a thin shell. The persistent shell should handle navigation and key status only.
- **D-02:** Route-level pages own their own header and contextual framing instead of competing with a global hero.

### Persistent status
- **D-03:** Keep operational status in the shell rather than rich telemetry summaries.
- **D-04:** The shell should prioritize connection state, freshness, battery, device count, and notification readiness.
- **D-05:** Input, output, net-power, and other richer telemetry summaries should move out of the persistent shell.

### Navigation model
- **D-06:** Keep the sidebar as the primary navigation model on desktop.
- **D-07:** Mobile should continue using a drawer version of the sidebar instead of introducing a separate top-nav system in this phase.

### Mobile shell behavior
- **D-08:** Use a mode-aware mobile shell that adapts by route.
- **D-09:** On mobile, the top shell should show page identity plus one route-relevant signal, not a full status cluster.

### the agent's Discretion
- Exact visual treatment for the thin shell, as long as it stays lighter than the current shell-plus-hero combination
- Which single signal best represents each route on mobile, as long as each route only gets one
- Exact wording, iconography, and density for the retained operational status items

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` - Phase 6 goal, requirements, and success criteria
- `.planning/REQUIREMENTS.md` - UI-01, UI-02, and UI-03 traceability and milestone constraints
- `.planning/PROJECT.md` - v1.1 milestone goal and project-level UI stabilization decision
- `.planning/STATE.md` - current milestone status and concerns carried into this phase

### Current shell implementation
- `dashboard/src/App.tsx` - current persistent shell, top bar, route hero, and route metadata behavior
- `dashboard/src/components/Sidebar.tsx` - current sidebar navigation, theme control, and shell status treatment
- `dashboard/src/index.css` - current shell, sidebar, top-bar, route-hero, and responsive layout rules

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dashboard/src/App.tsx`: already centralizes routing, WebSocket lifecycle, and shell-level status derivation
- `dashboard/src/components/Sidebar.tsx`: existing sidebar and mobile drawer behavior can be refined instead of replaced
- `dashboard/src/store/ws.ts`: live connection state and last-update freshness signals already exist for shell-level status
- `dashboard/src/lib/notifications.ts`: notification readiness is already exposed to the shell through the existing hook path
- `dashboard/src/store/theme.ts`: existing theme toggle can remain a shell concern

### Established Patterns
- Routing is centralized in `dashboard/src/App.tsx`
- Styling is currently split between large shared CSS and inline styles; Phase 6 should favor clearer shell ownership rather than adding more ad hoc presentation layers
- The dashboard already uses a sidebar-first mental model, so a desktop sidebar plus mobile drawer is an established pattern

### Integration Points
- Shell hierarchy changes should start in `dashboard/src/App.tsx`
- Navigation behavior changes should center on `dashboard/src/components/Sidebar.tsx`
- Responsive shell cleanup will primarily land in the shared shell sections of `dashboard/src/index.css`
- Route pages will likely need lighter page-owned headers once the shell stops carrying a heavy route hero

</code_context>

<specifics>
## Specific Ideas

- The current app should stop feeling like it has both a persistent header and a second dashboard living above every page.
- Mobile should feel intentionally simplified, not like the desktop shell was merely stacked into narrower columns.
- The shell should stay useful as an operational frame without becoming a mini telemetry board.

</specifics>

<deferred>
## Deferred Ideas

- Broader telemetry trust-state handling belongs primarily to Phase 7
- Shared card/control unification belongs primarily to Phase 8
- Deeper responsive cleanup beyond shell/navigation belongs primarily to Phase 9

</deferred>

---

*Phase: 06-unify-shell-and-navigation*
*Context gathered: 2026-04-16*
