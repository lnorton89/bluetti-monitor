# Quick Task 260606-euj: Make analytics web app polished and mobile friendly using Playwright verification

## Goal

Make the standalone `analytics/` React app usable and polished on phone-width screens without weakening the desktop analytics surface.

## Tasks

1. Audit the current mobile rendering with Playwright at narrow viewports and identify overflow, cramped controls, and broken panel composition.
2. Update analytics layout and styling so the header, control band, KPI cards, charts, field comparison, notes, and settings surfaces adapt cleanly on mobile.
3. Add or update Playwright coverage for mobile layout quality, including horizontal overflow and key controls remaining usable.
4. Run the analytics build and Playwright checks, then record the verification result.

## Acceptance Criteria

- The analytics page has no page-level horizontal overflow on mobile viewports around 390px wide.
- Controls stack into touch-friendly rows and key buttons remain reachable.
- KPI cards, chart panels, legends, side stats, snapshot cells, notes, and settings modal fit within mobile width without incoherent overlap.
- Existing desktop layout still builds and existing feature tests pass.
- Playwright verifies the mobile layout.
