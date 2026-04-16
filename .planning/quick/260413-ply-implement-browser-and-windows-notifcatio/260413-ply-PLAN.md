# Quick Task 260413-ply Plan

## Goal

Implement browser and Windows desktop notifications when the Bluetti battery reaches its full state of charge, using the device's reported battery ceiling when available.

## Tasks

### 1. Add notification threshold logic in the dashboard
- Files: `dashboard/src/lib/notifications.ts`, `dashboard/src/App.tsx`
- Action: Create a reusable notification helper/hook that watches live telemetry, detects when battery percent crosses the configured full-charge ceiling, and triggers browser plus desktop host notifications.
- Verify: Build succeeds and unit tests cover ceiling resolution plus threshold crossing.
- Done: The dashboard emits exactly one alert per charge cycle when the device reaches the full-charge threshold.

### 2. Surface alert status and permission control in the app shell
- Files: `dashboard/src/App.tsx`
- Action: Add top-bar status chips for browser/desktop alert readiness and a user-triggered browser permission button when permission is still undecided.
- Verify: Mock-mode UI still renders cleanly and the new control appears without breaking layout.
- Done: Users can see whether alert channels are armed and can enable browser notifications from the UI.

### 3. Forward desktop host messages to native notifications
- Files: `src/bun/index.ts`
- Action: Listen for host messages from the webview and map battery-full events to Electrobun native desktop notifications.
- Verify: TypeScript build succeeds for the desktop shell.
- Done: The Windows desktop wrapper shows a native notification when the dashboard signals a full-charge event.
