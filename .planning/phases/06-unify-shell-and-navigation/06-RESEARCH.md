# Phase 06: Unify Shell And Navigation - Research

**Researched:** 2026-04-16
**Domain:** React dashboard shell architecture, navigation state, and responsive app-frame behavior
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Claude's Discretion
- Exact visual treatment for the thin shell, as long as it stays lighter than the current shell-plus-hero combination
- Which single signal best represents each route on mobile, as long as each route only gets one
- Exact wording, iconography, and density for the retained operational status items

### Deferred Ideas (OUT OF SCOPE)
- Broader telemetry trust-state handling belongs primarily to Phase 7
- Shared card/control unification belongs primarily to Phase 8
- Deeper responsive cleanup beyond shell/navigation belongs primarily to Phase 9
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | User can move between overview, charts, solar, and raw-data views through a shell that has consistent hierarchy and does not feel visually jumbled | Use one shell metadata registry, keep desktop sidebar + mobile drawer, and remove the global route hero from the persistent frame |
| UI-02 | User can tell what page they are on and what the most important live status is without duplicated or competing header signals | Keep page identity in one shell surface on mobile, leave page-owned headers inside routes, and limit shell status to operational items from `useWsStore` and notifications |
| UI-03 | User can use sidebar and top-bar navigation reliably on desktop and mobile layouts | Keep `NavLink`-driven sidebar navigation, derive both desktop and mobile nav from the same route config, and expand Playwright coverage for drawer open/close and active-route behavior |
</phase_requirements>

## Summary

The current dashboard shell is doing too much in one place. `dashboard/src/App.tsx` owns a sticky top bar, route title copy, a large route hero, and a telemetry summary cluster, while the route pages already render strong page-specific headers and hero-like surfaces of their own. That is the direct cause of the visual competition Phase 6 is trying to remove. It also leaks into test instability: the existing Playwright suite already fails because the overview title appears twice and because the charts-page assertion no longer matches the current UI.

The clean implementation boundary is to keep the router and shell in `App.tsx`, but make the shell thinner and data-poorer. It should expose only navigation, operational status, and route identity. The richer telemetry storytelling belongs inside the route pages, which already have the right ownership. Do not introduce a new navigation model, do not migrate routers just to get route metadata, and do not mix Phase 7 trust-state work into this phase.

**Primary recommendation:** Keep the existing declarative React Router setup, replace the pathname ternary with a single local route registry that drives desktop sidebar items, mobile drawer items, and shell identity, and remove the persistent route hero entirely.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` | `19.2.4` | Component rendering for the dashboard shell and pages | Already pinned in `dashboard/package.json`; current project code is built around React 19 function components |
| `react-router-dom` | `7.13.2` | Client-side routing and active navigation state | Already in use; `NavLink` gives active-state styling and `aria-current` without custom matching |
| `zustand` | `5.0.12` | Live shell status source via `useWsStore` and theme state | Already the project’s shell-level state mechanism; avoids inventing a new shell store |
| `index.css` + existing responsive CSS | repo-local | Shell layout, sidebar, top bar, and breakpoint behavior | Current app shell is already CSS-driven; this phase is a cleanup, not a styling-system migration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | `5.95.2` | Route pages fetch historical data, but the shell should stay query-light | Leave page-level data fetching inside route pages; do not move charts/solar summaries into the shell |
| `lucide-react` | `1.0.1` | Shared iconography for navigation and shell status items | Reuse the existing icon set for operational status chips and navigation labels |
| `@playwright/test` | `1.58.2` | End-to-end validation of shell hierarchy and mobile drawer behavior | Use for regression coverage of nav, route identity, and responsive shell behavior |
| `vite` | `8.0.1` | Local dev server used by Playwright and dashboard development | Keep the current Vite setup; no bundler changes are needed for this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local route metadata registry in declarative routing | `createBrowserRouter` + `useMatches` + `handle` | More router churn than this phase needs; official docs position `useMatches`/`handle` as a fuller route-tree abstraction, but current app does not need a router migration just to centralize labels |
| Shared sidebar content rendered as desktop sidebar and mobile drawer | Separate mobile top-nav system | Violates locked decisions D-06 and D-07 and duplicates navigation logic |
| Thin operational shell | Global hero with telemetry stats | Directly conflicts with D-01 through D-05 and duplicates page-owned framing |

**Installation:**
```bash
npm --prefix dashboard install
```

**Version verification:** Verified with npm registry on 2026-04-16.
- `react@19.2.4` published 2026-01-26; latest is `19.2.5`
- `react-router-dom@7.13.2` published 2026-03-23; latest is `7.14.1`
- `@tanstack/react-query@5.95.2` published 2026-03-23; latest is `5.99.0`
- `vite@8.0.1` published 2026-03-19; latest is `8.0.8`
- `@playwright/test@1.58.2` published 2026-02-06; latest is `1.59.1`

## Architecture Patterns

### Recommended Project Structure
```text
dashboard/src/
├── App.tsx                  # Router provider and top-level shell mount
├── app/
│   ├── shell.tsx            # Thin persistent shell
│   └── routes.ts            # Single source of truth for nav + shell metadata
├── components/
│   └── Sidebar.tsx          # Desktop sidebar + mobile drawer rendered from route config
├── pages/                   # Route-owned headers and contextual framing
└── store/
    └── ws.ts                # Connection state + freshness feeding shell status
```

### Pattern 1: Single Route Registry
**What:** Define one typed route metadata list for `path`, `label`, `icon`, `desktop sidebar presence`, `mobile top-bar title`, and `mobile primary signal`.

**When to use:** Any time shell identity, nav rendering, or route-specific mobile signal needs to change.

**Why:** The current pathname ternary in `App.tsx` duplicates information that should live in one place. A single registry lets desktop sidebar, mobile drawer, and shell identity stay synchronized.

### Pattern 2: Thin Persistent Shell, Page-Owned Context
**What:** The persistent frame renders navigation and operational status only. Each page keeps its own hero/header/storytelling surface.

**When to use:** All four Phase 6 routes.

**Why:** The current app already gives each page strong route-local framing. Removing the global route hero fixes duplication without throwing away the route work already done.

### Pattern 3: Sidebar Content Reuse Across Desktop And Mobile
**What:** Render the same nav item list into a fixed desktop sidebar and a mobile drawer, rather than building separate nav definitions.

**When to use:** Desktop shell and mobile shell.

**Why:** This preserves D-06 and D-07 while avoiding drift between layouts.

### Pattern 4: Shell Status From Existing Operational Sources
**What:** Keep shell status items derived from `useWsStore` and `useBatteryFullNotifications`: connection, freshness, battery, device count, and notification readiness.

**When to use:** Persistent status cluster and route-specific mobile signal selection.

**Why:** These signals already exist in live state. Input/output/net power belong to route pages, not the global shell.

### Anti-Patterns to Avoid
- **Manual pathname branching for shell copy:** Replace the current chained `location.pathname === ...` metadata logic with one registry.
- **Global telemetry hero in the shell:** Remove the persistent `route-hero` and its input/output/net/freshness summary from `App.tsx`.
- **Route pages depending on shell hero for meaning:** Pages should render self-contained framing after the global hero is removed.
- **Separate mobile navigation model:** Do not add a distinct top-nav or tab-bar in this phase.
- **Router migration for metadata only:** The current declarative router is sufficient for this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active-route detection | Custom pathname matching helpers | `NavLink` | Official docs: `NavLink` already provides active styling hooks and `aria-current="page"` |
| Accessible current-page nav semantics | Manual `aria-current` wiring on plain anchors | `NavLink` | Reduces accessibility bugs and selector drift |
| Separate desktop/mobile nav definitions | Two divergent nav trees | One shared route registry rendered twice | Prevents label/icon/path drift |
| Shell freshness logic | New timers or duplicate timestamps | `useWsStore().lastUpdate` | Freshness already exists in the websocket store |
| Notification readiness state | New shell-only notification status logic | `useBatteryFullNotifications` output | Keeps shell status aligned with existing browser/desktop notification behavior |

**Key insight:** Phase 6 is mostly a data-ownership and rendering-boundary cleanup. The project already has the data, router, sidebar, store, and responsive CSS primitives it needs.

## Common Pitfalls

### Pitfall 1: Fixing duplication only visually
**What goes wrong:** The UI looks thinner, but route titles and signals are still defined in multiple places.

**Why it happens:** Styling changes get applied before metadata ownership is consolidated.

**How to avoid:** Centralize route metadata first, then refactor shell markup around that source.

**Warning signs:** Updating a route name requires touching both `App.tsx` and `Sidebar.tsx`, or desktop/mobile labels diverge.

### Pitfall 2: Leaving route pages dependent on the removed shell hero
**What goes wrong:** Once the global route hero is removed, a page feels abrupt or loses essential context.

**Why it happens:** The route page was implicitly relying on the shell to provide identity or summary copy.

**How to avoid:** Audit all four route pages during planning and explicitly decide which page-owned header remains or needs light adjustment.

**Warning signs:** A route renders content cards immediately at the top with no page-owned context.

### Pitfall 3: Mixing Phase 7 state handling into Phase 6
**What goes wrong:** The plan balloons into trust-state logic, empty-state semantics, and partial-data behavior.

**Why it happens:** Shell status and telemetry trust are adjacent concerns.

**How to avoid:** Restrict Phase 6 shell status to the operational signals in D-04; leave nuanced telemetry confidence handling for Phase 7.

**Warning signs:** Planning starts adding offline/stale/missing-state matrices for every route surface.

### Pitfall 4: Assuming the current tests already protect shell behavior
**What goes wrong:** The planner reuses stale tests and misses shell regressions.

**Why it happens:** Existing Playwright coverage predates the current UI shape.

**How to avoid:** Treat shell-related Playwright assertions as needing rewrite in Wave 0.

**Warning signs:** Assertions still target duplicated overview titles or removed charts controls like `Add Chart`.

## Code Examples

Verified patterns from official sources:

### Active Sidebar Links With Router-Managed Current State
```tsx
// Adapted from React Router docs
<nav>
  <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>
    Overview
  </NavLink>
  <NavLink to="/charts" className={({ isActive }) => isActive ? "active" : ""}>
    Charts
  </NavLink>
</nav>
```
Source: https://reactrouter.com/api/components/NavLink

### Playwright Web Server Config For Local UI Validation
```ts
// Adapted from Playwright docs
export default defineConfig({
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
  },
})
```
Source: https://playwright.dev/docs/test-webserver

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global shell owns page title, large hero, and telemetry summary | Thin persistent shell owns nav + operational status; route pages own contextual framing | Align with v1.1 Phase 6 decisions on 2026-04-16 | Removes competing headers and clarifies ownership |
| Manual route identity branching in shell | Single route metadata source driving shell and navigation | Recommended for this phase | Easier maintenance and fewer desktop/mobile mismatches |
| Distinct mobile nav concepts | Same sidebar content reused as a mobile drawer | Locked decision for Phase 6 | Preserves product consistency across layouts |

**Deprecated/outdated:**
- Persistent `route-hero` in `App.tsx`: conflicts with the thin-shell decision and duplicates route-level framing.
- Shell-level input/output/net summary: explicitly out of scope for the persistent frame in D-05.

## Open Questions

1. **Where should route metadata live?**
   - What we know: `App.tsx` currently owns route identity through a pathname ternary, and `Sidebar.tsx` owns nav labels separately.
   - What's unclear: Whether to keep the registry in `App.tsx` or extract it to `dashboard/src/app/routes.ts`.
   - Recommendation: Extract to a small local module if Phase 6 touches both shell and sidebar; otherwise keep a typed constant in `App.tsx` and pass it down.

2. **Should this phase migrate to a data router for route metadata?**
   - What we know: Official React Router docs position `useMatches`/`handle` as a route-metadata pattern, but current app uses `BrowserRouter` with declarative `Routes`.
   - What's unclear: Whether the planner might treat a router migration as attractive cleanup.
   - Recommendation: Do not migrate routers in Phase 6. Use a local metadata registry and keep the refactor scoped to shell coherence.

3. **What single mobile signal should each route surface?**
   - What we know: D-09 requires one route-relevant signal on mobile, not a full status cluster.
   - What's unclear: Final mapping per route.
   - Recommendation: Decide this explicitly in planning and document it in the implementation tasks so CSS and tests target the same behavior.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Dashboard dev server and Playwright validation | ✓ | `v22.18.0` | — |
| npm | Dashboard scripts and registry verification | ✓ | `10.9.3` | — |
| Bun | Desktop shell smoke/regression checks if needed | ✓ | `1.3.11` | Skip desktop shell runtime checks if Phase 6 stays dashboard-only |
| Playwright CLI | E2E validation | ✓ | global `1.59.1`; repo pins `1.58.2` | Use `npm --prefix dashboard run test:e2e` so the repo-local package is used |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright `1.58.2` |
| Config file | `dashboard/playwright.config.ts` |
| Quick run command | `npm --prefix dashboard run test:e2e -- tests/dashboard.spec.ts` |
| Full suite command | `npm --prefix dashboard run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Shell hierarchy is consistent and overview/charts/solar/raw feel like one product surface | e2e | `npm --prefix dashboard run test:e2e -- tests/dashboard.spec.ts` | ✅ but stale |
| UI-02 | Only one shell-level page identity is visible at a time and primary status is not duplicated | e2e | `npm --prefix dashboard run test:e2e -- tests/initial-layout.spec.ts` | ✅ but stale |
| UI-03 | Desktop sidebar and mobile drawer navigation both work reliably | e2e | `npm --prefix dashboard run test:e2e -- tests/dashboard.spec.ts` | ✅ but stale |

### Sampling Rate
- **Per task commit:** `npm --prefix dashboard run test:e2e -- tests/dashboard.spec.ts`
- **Per wave merge:** `npm --prefix dashboard run test:e2e`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Rewrite the existing overview-title assertions so they target one shell identity instead of the currently duplicated text
- [ ] Replace the stale charts assertion for `Add Chart` with assertions that match the current charts workspace
- [ ] Add explicit mobile drawer open/close assertions, including active route state after navigation
- [ ] Add shell-specific assertions for the single mobile signal and absence of the removed global route hero

**Current baseline:** `npm --prefix dashboard run test:e2e` failed on 2026-04-16 with 3/3 failing tests. Two failures are caused by duplicated overview title text in the current shell; one is caused by a stale charts-page assertion.

## Sources

### Primary (HIGH confidence)
- Local codebase inspection:
  - `dashboard/src/App.tsx`
  - `dashboard/src/components/Sidebar.tsx`
  - `dashboard/src/index.css`
  - `dashboard/src/pages/Overview.tsx`
  - `dashboard/src/pages/Charts.tsx`
  - `dashboard/src/pages/Solar.tsx`
  - `dashboard/src/pages/RawData.tsx`
  - `dashboard/src/store/ws.ts`
  - `dashboard/src/lib/notifications.ts`
  - `dashboard/tests/dashboard.spec.ts`
  - `dashboard/tests/initial-layout.spec.ts`
  - `dashboard/playwright.config.ts`
- React Router official docs:
  - https://reactrouter.com/api/components/NavLink
  - https://reactrouter.com/start/declarative/navigating
  - https://reactrouter.com/how-to/accessibility
  - https://reactrouter.com/api/components/Route/
- Playwright official docs:
  - https://playwright.dev/docs/test-webserver
  - https://playwright.dev/docs/test-projects
- npm registry verification via `npm view` for:
  - `react`
  - `react-router-dom`
  - `@tanstack/react-query`
  - `vite`
  - `@playwright/test`

### Secondary (MEDIUM confidence)
- None

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified against local package manifests and npm registry on 2026-04-16
- Architecture: HIGH - driven by locked phase decisions, current code inspection, and official React Router behavior
- Pitfalls: HIGH - directly observed in the current shell and confirmed by failing Playwright tests

**Research date:** 2026-04-16
**Valid until:** 2026-05-16
