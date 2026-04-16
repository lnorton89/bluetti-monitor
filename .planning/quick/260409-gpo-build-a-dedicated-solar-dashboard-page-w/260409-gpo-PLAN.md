# Quick Task 260409-gpo: Build a dedicated solar dashboard page with live stats, charts, both solar inputs, and battery full-charge estimates using existing telemetry while matching the home and charts design language

## Goal

Create a dedicated solar workspace in the React dashboard that centralizes live solar generation monitoring for both PV inputs, shows history/graphs, and provides a battery full-charge estimate derived from real telemetry fields already available in the stack.

## Tasks

### 1. Add solar workspace routing and page structure
- Files: `dashboard/src/App.tsx`, `dashboard/src/components/Sidebar.tsx`, `dashboard/src/pages/Solar.tsx`
- Action: add a dedicated `/solar` route, expose it in navigation, and build a solar-specific page shell that follows the same visual hierarchy and utility-copy patterns as the overview and charts pages.
- Verify: the app can navigate to `/solar`, and the page renders a device/range-aware workspace instead of a generic placeholder.
- Done: route metadata and navigation entry are wired, and the new page is reachable.

### 2. Build solar-specific telemetry analysis and live estimation
- Files: `dashboard/src/pages/Solar.tsx`
- Action: use live websocket state plus history queries to surface total solar input, PV1/PV2 splits, voltage/current details, solar share, harvest peaks, charging posture, and a battery full-charge estimate using live `battery_range_to_full` when present or a fallback derived from battery-percent trend and configured charge ceiling.
- Verify: the page uses real field aliases from the current data model, handles missing fields gracefully, and presents charts/cards for both solar inputs and battery charging progress.
- Done: solar metrics, charts, and estimate logic are all powered by existing telemetry fields.

### 3. Match the established dashboard design language
- Files: `dashboard/src/index.css`
- Action: add solar page styles that reuse the home/charts visual system while giving the solar route its own focused workspace identity and responsive behavior.
- Verify: the page reads consistently with the rest of the dashboard on desktop and mobile, with clear contrast and usable layouts at narrow widths.
- Done: the solar page looks integrated with the existing app rather than bolted on.
