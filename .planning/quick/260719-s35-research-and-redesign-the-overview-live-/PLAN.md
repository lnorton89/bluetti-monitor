---
status: complete
created: "2026-07-20T03:19:00Z"
quick_id: 260719-s35
slug: research-and-redesign-the-overview-live-
research: true
validate: true
---

# Redesign the Overview live snapshot

## Goal

Replace the cramped Overview snapshot with a polished, immediately understandable live power-flow surface that is composed correctly at the default Electrobun window size and remains usable on mobile.

## Tasks

1. Rebuild the Overview hero as a source -> AC500 -> load hub with a battery branch, integrated SOC, direct labels, and a concise live balance statement. Remove historical queries and duplicated device-level status from the live path.
2. Simplify the application top bar so the default Electrobun window no longer truncates or wraps: omit redundant one-device and Overview battery chips, and present one explicit battery-full alert status.
3. Replace legacy hero styles with a responsive, finished visual system and update focused Playwright expectations.
4. Build and test the dashboard, inspect it with Playwright at desktop/mobile sizes using real AC500 data, save screenshots, and verify supervisor/log health.

## Must-haves

- Current source, battery, and load values remain traceable to the existing live telemetry fields.
- Battery balance is clearly identified as a calculated input/output difference, not a direct pack sensor.
- Desktop composition is coherent at the 1500 x 960 Electrobun default and does not wrap the top bar.
- Mobile has no horizontal overflow and retains direct labels without relying on hover.
- Existing detail sections and tooltip provenance remain available.
- The real AC500 supervisor stays alive throughout final verification.

## Result

Completed in code commit `b2cd17f`. All must-haves passed live and automated verification.

