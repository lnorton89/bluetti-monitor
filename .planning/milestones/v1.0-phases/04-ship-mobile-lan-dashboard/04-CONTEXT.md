# Phase 4: Ship Mobile LAN Dashboard - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the existing dashboard genuinely usable from a phone browser on the local network without desktop-only layout problems. User can read core monitoring data, navigate all views, and interact with key controls on mobile-sized screens.

</domain>

<decisions>
## Implementation Decisions

### Navigation Model
- **D-01:** Keep existing sidebar-as-drawer pattern — sidebar already has mobile breakpoint at 1024px with hamburger button, drawer slides from left with overlay
- **D-02:** No bottom navigation bar — sidebar navigation is sufficient for 4 routes

### Layout Adaptation
- **D-03:** Single-column stack on mobile — existing CSS media queries (1024px, 480px) collapse grids to single column
- **D-04:** Route hero section stacks vertically on mobile with stats below copy
- **D-05:** Power flow panel shows Input → Battery → Output in vertical stack, hiding arrows between nodes

### Information Density
- **D-06:** Dense grids (category-grid, detail-grid) collapse to single column — existing `repeat(auto-fit, minmax(...))` patterns handle this
- **D-07:** Min-width constraints removed on mobile — `minmax(0, 1fr)` prevents overflow issues
- **D-08:** Long text values use `overflow-wrap: anywhere` to prevent horizontal scroll

### Touch Targets
- **D-09:** Standard spacing (12-16px padding on cards, 10-14px gaps) is sufficient — no explicit touch target size requirements
- **D-10:** Interactive elements (buttons, chips, nav links) already have adequate padding

### Charts on Mobile
- **D-11:** Charts use responsive containers via `analytics-chart-shell` — existing single-column layout handles this
- **D-12:** No special landscape mode needed — standard portrait scrolling is sufficient

### Typography
- **D-13:** Font sizes scale with `clamp()` functions already in use — hero title, battery value, etc. adjust naturally
- **D-14:** Monospace font (Share Tech Mono) used for values — maintains readability at small sizes

### PWA Fundamentals
- **D-15:** Viewport meta tag ensures proper mobile scaling — must verify in index.html
- **D-16:** No standalone manifest/icon work in this phase — that is Phase 5 scope (PWA-02)

### Data Tables
- **D-17:** Raw data table has `min-width: 820px` causing horizontal scroll on mobile — table body scrolls horizontally via `overflow-x: auto` on `.data-table-scroll`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/ROADMAP.md` — Phase 4 goals, requirements [PWA-01, PWA-03], success criteria, and plan numbers
- `.planning/PROJECT.md` — LAN-first access constraint, deliver phone access as LAN PWA
- `.planning/REQUIREMENTS.md` — PWA-01, PWA-03 requirements definition

### Dashboard Architecture
- `dashboard/src/App.tsx` — Layout component with sidebar, top bar, route hero, and 4 routes (Overview, Charts, Solar, RawData)
- `dashboard/src/components/Sidebar.tsx` — Navigation sidebar with mobile drawer support (hamburger + overlay)
- `dashboard/src/index.css` — All styles including existing mobile breakpoints at 1024px and 480px

### Existing Responsive Patterns
- Media query at 1024px: sidebar becomes drawer, grids collapse to 1 column
- Media query at 480px: additional font size reductions, single column grids
- Hamburger button hidden by default, shown at 1024px
- `color-mix()` for transparency effects
- `clamp()` for fluid typography

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Sidebar component with `isOpen`/`onClose` props — already handles mobile drawer state
- Route hero section pattern — stacks on mobile already
- Grid patterns with `repeat(auto-fit, minmax(...))` — responsive by default
- Card component with hover effects — works on touch (no hover on mobile)

### Established Patterns
- CSS custom properties for theming (`--bg`, `--text`, `--amber`, etc.)
- Dark mode via `[data-theme="light"]` selector
- Sidebar drawer with overlay backdrop blur
- Sticky top bar with blur backdrop

### Integration Points
- Vite config may need viewport meta tag check
- No service worker or manifest work in this phase
- Dashboard entry point is `dashboard/src/main.tsx`

</code_context>

<specifics>
## Specific Ideas

- Sidebar tagline says "AC500-focused desktop telemetry" — may want to update to reflect mobile support
- Desktop shell tagline in Sidebar.tsx: "MONITOR v1.0" — consider mobile-aware version
- Top bar metrics row wraps on mobile — existing `flex-wrap: wrap` handles this

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
None — no pending todos matched Phase 4 scope.

</deferred>

---

*Phase: 04-ship-mobile-lan-dashboard*
*Context gathered: 2026-04-16*
*Auto mode: All gray areas selected with recommended defaults*
