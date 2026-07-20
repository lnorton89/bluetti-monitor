---
quick_id: 260719-reb
status: complete
description: Compact Charts and Solar mobile report headers while preserving every control and desktop layout
---

# Compact Mobile Analytics Headers

## Task 1: Measure the live header bottleneck

**Files:** `.dev-data/ui-audit/charts-mobile-header-before-2.png`, `.dev-data/ui-audit/solar-mobile-header-before-2.png`

**Action:** Capture Charts and Solar at 390x844 against the running real-AC500 dashboard. Measure the complete analytics hero, metadata, toolbar, selector, window controls, and focus controls.

**Verify:** Confirm no horizontal overflow and record component heights for a direct after comparison.

**Done:** The baseline identifies 152px metadata stacks and 288px toolbars inside 705–738px headers.

## Task 2: Compact the phone presentation without hiding controls

**Files:** `dashboard/src/pages/Charts.tsx`, `dashboard/src/pages/Solar.tsx`, `dashboard/src/index.css`

**Action:** Tighten report titles and summaries, arrange mobile metadata as a compact grid, and keep the window and focus choices in single touch-safe rows where their labels fit. Scope the density changes to analytics hero cards below 480px so desktop layout and lower report panels remain unchanged.

**Verify:** Inspect live 1440px and 390px screenshots and compare bounding-box measurements to the baseline.

**Done:** Useful report data appears materially sooner on phone while every selector and tab remains visible and at least 44px high.

## Task 3: Add responsive regression coverage

**Files:** `dashboard/tests/phase9-responsive.spec.ts`

**Action:** Assert compact header height, metadata layout, single-row window/focus controls, touch-target size, and zero horizontal overflow for both routes.

**Verify:** `npm --prefix dashboard run build` and `npm --prefix dashboard run test:e2e` pass.

**Done:** Playwright protects the compact mobile layout without changing desktop behavior.
