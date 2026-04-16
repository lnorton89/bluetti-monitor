---
status: complete
phase: 06-unify-shell-and-navigation
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md
started: 2026-04-16T00:00:00Z
updated: 2026-04-16T15:30:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Route Labels in Navigation
expected: Navigate to the dashboard. Sidebar (desktop) or drawer (mobile) shows route labels: Overview, Charts, Solar, Raw Data with appropriate icons.
result: pass

### 2. Thin Shell Without Route Hero
expected: The top bar shows only the route title, route signal chip, and operational status. No duplicate "route hero" element appears above page content.
result: pass

### 3. Mobile Drawer Opens
expected: On mobile viewport, clicking the hamburger icon opens a drawer/menu showing all navigation routes.
result: pass

### 4. Desktop Sidebar Active State
expected: On desktop, clicking a sidebar route highlights it as active (visual styling change).
result: pass

### 5. Overview Shell Signal - Battery Reserve
expected: On the Overview page, the top bar shows a mobile signal chip with battery reserve percentage (e.g., "50%" or similar).
result: pass

### 6. Charts Shell Signal - Active Range
expected: On the Charts page, the top bar shows a mobile signal chip with the active history window/range (e.g., "24h", "7d", or "30d").
result: pass

### 7. Solar Shell Signal - Solar Watts
expected: On the Solar page, the top bar shows a mobile signal chip with current solar wattage (e.g., "450W" or similar).
result: pass

### 8. Raw Data Shell Signal - Field Count
expected: On the Raw Data page, the top bar shows a mobile signal chip with the count of visible fields (e.g., "12 fields").
result: pass

### 9. Shell Signal Resets on Navigation
expected: When navigating from a route with a signal value to another route, the previous signal does not linger in the top bar after navigation completes.
result: pass

### 10. Playwright E2E Suite Passes
expected: Running `npm --prefix dashboard run test:e2e` completes with all tests passing.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
