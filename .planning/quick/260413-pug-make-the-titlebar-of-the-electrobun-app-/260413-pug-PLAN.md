# Quick Task 260413-pug Plan

## Goal

Make the native Electrobun window title show the current power mode and battery state of charge from live telemetry.

## Tasks

### 1. Add title derivation helpers
- Files: `src/bun/titlebar.ts`
- Action: Create pure helpers that read device telemetry, derive a compact mode label, and format the window title.
- Verify: Unit tests cover waiting, charging, discharging, and idle titles.
- Done: The shell has one reusable source of truth for title text.

### 2. Wire the desktop shell to live telemetry
- Files: `src/bun/index.ts`
- Action: Subscribe the desktop shell to the API WebSocket snapshot/update stream and refresh the native window title when telemetry changes.
- Verify: Root TypeScript build passes cleanly.
- Done: The title bar updates in real time without depending on the dashboard UI.
