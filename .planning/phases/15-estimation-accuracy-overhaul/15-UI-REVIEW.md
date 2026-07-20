---
phase: 15-estimation-accuracy-overhaul
reviewed: 2026-07-20
status: passed_after_remediation
overall_score: 21/24
---

# Phase 15 UI Review

## Verdict

**BLOCK — 15/24.** The desktop shell and analytics routes are cohesive, but Overview has a responsive sizing defect that makes its phone layout thousands of pixels taller than its content. Its lower half also lacks the report hierarchy established by Charts and Solar, so otherwise useful telemetry reads as a sequence of unrelated panels.

## Evidence

- Real AC500 dashboard served by the live supervisor at `http://127.0.0.1:5400`.
- Desktop viewport: 1440x1000. Phone viewport: 390x844.
- Before screenshots: `.dev-data/ui-audit/*-desktop-before.png`, `.dev-data/ui-audit/*-mobile-before.png`, and `.dev-data/ui-audit/*-mobile-top-before.png`.
- No route produced horizontal overflow.
- Full-page phone heights: Overview 7552px, Charts 4608px, Solar 9086px, Raw Data 12914px, Settings 3046px. Solar and Raw Data are content-dense; Overview's height includes unintended empty space inside stacked info rows.

## Six-Pillar Score

| Pillar | Score | Findings |
|---|---:|---|
| Copy | 3/4 | Labels are generally clear, but Overview's subtitle describes implementation details instead of the user's current system state. “Live telemetry stream” repeats information already conveyed by the live status treatment. |
| Visuals | 2/4 | Icons and data treatments are consistent, but Overview's five ungrouped summary tiles and mixed six-card detail grid feel disconnected from the hero. |
| Color | 3/4 | Category color mapping is consistent. Light-theme pastel accents become faint in compact metric cards and compete with the stronger amber shell accent. |
| Typography | 3/4 | The condensed display and mono data typography form a recognizable system. Overview lacks intermediate section headings, weakening scanning hierarchy. |
| Spacing | 2/4 | Desktop rhythm is usable, but auto-fit places four detail panels above two without semantic intent. On phone, retained flex bases expand every stacked info row dramatically. |
| Experience | 2/4 | Live data, status, and navigation work with no horizontal overflow. The phone info-row defect materially impairs navigation and obscures the Switchboard section far below the fold. |

## Priority Findings

### BLOCK: stacked info rows retain horizontal flex bases

At widths below 1024px, `.info-row` changes to `flex-direction: column`, while `.info-row-label` and `.info-row-value` retain `flex-basis: 120px` and `160px`. Those bases become vertical sizes. Reset both children to intrinsic sizing in the stacked layout and add a regression assertion for row height.

### FLAG: Overview has no semantic grouping below the hero

The five snapshot metrics, three telemetry panels, and three configuration tables are sibling grids. Introduce small report headings for system essentials, power channels, and configuration/identity, and use explicit three-column grids on wide screens.

### FLAG: phone summary tiles are needlessly single-column

The compact summary tiles fit two across at 390px. Preserve two columns on phone and let an odd final tile span both columns to reduce page length without shrinking touch targets or data text.

### FLAG: Overview copy is implementation-centered

Replace the field-set explanation with a concise statement about live power flow, battery reserve, and AC500 state. Shorten the online chip to “Telemetry live.”

## Strengths To Preserve

- Charts and Solar already use a strong report pattern: eyebrow, descriptive title, supporting copy, metadata, controls, and focused panels.
- The responsive shell, drawer navigation, route signal, and settings controls remain readable at 390px.
- Raw Data intentionally changes from a table to self-contained field cards on phone.
- All audited routes remain connected to real telemetry and avoid horizontal scrolling.

## Remediation Target

Re-capture Overview at both viewports after the quick task. The review passes when stacked info rows size to their content, the wide layout has three intentional report groups, there is no horizontal overflow, and the complete phone page is materially shorter.

## Remediation Results

**PASS — 21/24.** Quick task `260719-r4k` resolved the block and implemented the priority hierarchy improvements.

- Added three explicit Overview report groups: System Essentials, Power Channels, and Configuration and Identity.
- Replaced implementation-centered introductory copy and simplified the live status label.
- Made both wide detail grids intentional three-column rows, with two columns at tablet sizes and one column on narrow phones.
- Preserved a two-column essentials grid at 390px and let its odd final tile span the row.
- Reset stacked `.info-row` children to intrinsic flex sizing. Real phone rows now measure 56px instead of inheriting 120px and 160px vertical bases.
- Reduced the real 390px Overview height from 7552px to 4497px, a 40% reduction, while retaining every field and control.
- Confirmed 1440px and 390px layouts have no horizontal overflow.
- `npm --prefix dashboard run build` passed.
- `npm --prefix dashboard run test:e2e` passed with 8 tests, including new responsive regression coverage.

Post-remediation pillar scores: Copy 4/4, Visuals 3/4, Color 3/4, Typography 4/4, Spacing 3/4, Experience 4/4.
