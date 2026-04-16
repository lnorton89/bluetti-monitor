# Phase 5: Installable PWA Polish - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Package the dashboard as an installable LAN PWA without disrupting live monitoring experience.

</domain>

<decisions>
## Implementation Decisions

### PWA Plugin
- **D-01:** Use `vite-plugin-pwa` for manifest and service worker generation
- **D-02:** Generate manifest.json with standard PWA metadata (name, icons, theme, start_url)

### App Identity
- **D-03:** App name: "Bluetti Monitor"
- **D-04:** Theme color: Use existing dashboard theme color (#1a1a2e or similar dark)
- **D-05:** Use existing favicon.svg as app icon source

### Caching Strategy
- **D-06:** Network-first for API calls to ensure live data
- **D-07:** Cache-first for static assets (JS, CSS, fonts)
- **D-08:** Do not cache WebSocket connections

### Service Worker Behavior
- **D-09:** Skip waiting - update immediately on new version
- **D-10:** Clients claim - new sw takes control immediately

### Offline Behavior
- **D-11:** Show cached dashboard shell when offline
- **D-12:** Display "Offline - awaiting connection" status
- **D-13:** No offline data persistence needed (telemetry is live)

### Update Flow
- **D-14:** Show "Update available" prompt when new version detected
- **D-15:** User-triggered reload to update (no forced refresh)
- **D-16:** Auto-update on next visit for minor patches

### the agent's Discretion
- Icon sizes and generation (standard 192x192, 512x512)
- Exact manifest field values (short_name, description)
- PWA install prompt timing

</decisions>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dashboard/dist/favicon.svg` — Existing icon that can be reused for PWA icons
- `dashboard/index.html` — Entry point for start_url

### Established Patterns
- Vite-based build with React plugin
- CSS variables for theming (--bg-1, --text, etc.)
- WebSocket store for live data

### Integration Points
- `vite.config.ts` — Add PWA plugin here
- `index.html` — Add manifest link and theme-color meta
- `dashboard/dist/` — Generated output for service worker

</code_context>

<specifics>
## Specific Ideas

- Keep it simple - focus on installability, not offline-first complexity
- Match existing dashboard aesthetic for theme colors
- Minimize update friction - live monitoring is the priority

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-installable-pwa-polish*
*Context gathered: 2026-04-16*
