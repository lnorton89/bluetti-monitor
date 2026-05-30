# Analytics Improvements Roadmap

**Source:** `analytics/tmp/improvements.md` — 392-line brainstorming document with UI/UX, data viz, new feature, and technical improvement ideas.

**Goal:** Convert the analytics app from a telemetry viewer into a decision-support dashboard.

---

## Phase 1: Visual Hierarchy & Layout Polish (Quick Wins)

**Effort:** Small  
**Dependencies:** None  
**Files:** `analytics/src/App.tsx`, `analytics/src/styles/base.css`, `analytics/src/components/Kpi.tsx`, `analytics/src/components/SideStat.tsx`

- Enlarge metric values (32–40px), shrink labels (11–12px uppercase), reduce supporting metadata to 10px muted
- Add card backgrounds with `--surface-soft` to visually separate panels from the app background
- Apply consistent 8px-base spacing grid — uniform panel padding, title offsets, chart margins
- Make `.side-stat` values larger and bolder, labels smaller and muted
- Ensure all unit indicators (W, V, A, %) are always shown clearly on graph axes and stat displays

---

## Phase 2: Semantic Color System

**Effort:** Small  
**Dependencies:** None  
**Files:** `analytics/src/styles/base.css`, `analytics/src/App.tsx`, `analytics/src/components/DenseTimeSeries.tsx`

- Map colors to meaning: Solar = yellow/gold, Battery = green, Grid/AC = blue, Fault = red, Load = magenta/orange
- Assign the `rainbow` const colors semantically instead of rainbow order
- Reduce ambient glow opacity by 60–70% (the purple radial bloom), keep glow for hover/alerts
- Darken chart colors in light mode so data is the brightest element
- Ensure chart line colors match the labels in `.side-stats` and `.legend-strip`

---

## Phase 3: Chart Improvements — Solar Input & Series Toggling

**Effort:** Medium  
**Dependencies:** Phase 2 (colors settled)  
**Files:** `analytics/src/App.tsx`, `analytics/src/components/DenseTimeSeries.tsx`

- Add toggle pill controls above the Solar Input chart: Power | Voltage
- When "Power" is active, show DC1/DC2 wattage only; when "Voltage" is active, show DC1/DC2 voltage only
- Reduce the 4-line chart to 2-line views, eliminating scale confusion
- Add interactive legends across all charts — clicking a series name toggles visibility
- Add Y-axis padding (5% top/bottom) so lines don't clip at chart edges

---

## Phase 4: Actionable System Summary

**Effort:** Medium  
**Dependencies:** None  
**Files:** `analytics/src/App.tsx`, `analytics/src/hooks/useTimelineSummary.ts`, `analytics/src/lib/analytics.ts`

- Add a "System Summary" section at the very top of the analytics page
- Show 3–4 generated lines of plain-language intelligence:
  - Battery can sustain current load for ~X hours
  - Solar offset today: X%
  - Peak load occurred at HH:MM
  - One abnormal voltage fluctuation detected (or "All clear")
- Keep this section visually distinct — larger text, card background, subtle accent border
- Pull data from existing `TimelineSummary` fields (batterySummary, peakLoad, solarShare, voltageSummary)

---

## Phase 5: Tooltips & Plain-Language Labels

**Effort:** Small  
**Dependencies:** None  
**Files:** `analytics/src/components/PanelHeader.tsx`, `analytics/src/components/SideStat.tsx`, `analytics/src/components/DenseTimeSeries.tsx`

- Add tooltip explanations for all technical terms: SOC, DC1/DC2, net power, input coverage
- Replace "24H window, 96 buckets" with "Last 24 hours (15 min intervals)"
- Add hover tooltips on every `.side-stat` showing "Min: X, Max: Y, Avg: Z, Points: N"
- Replace raw field names in Field Comparison with readable labels from `getFieldMeta()`
- Show skeleton/spinner while history data is loading (use `historyQuery.isFetching`)

---

## Phase 6: Time Controls & Playback

**Effort:** Medium  
**Dependencies:** None  
**Files:** `analytics/src/components/ControlsBand.tsx`, `analytics/src/styles/base.css`

- Convert time range pills to a segmented control with stronger active state styling
- Add "Live" and "Today" presets alongside existing 1H/6H/24H/3D/7D
- Add playback scrubbing — a timeline slider that lets users scrub through historical data
- Ensure live time-window bar animation is seamless (already mostly done)

---

## Phase 7: Field Comparison Redesign

**Effort:** Medium  
**Dependencies:** None  
**Files:** `analytics/src/components/FieldComparisonPanel.tsx`, `analytics/src/components/FieldChipList.tsx`

- Replace the dense toggle-chip grid with a searchable metric selector
- Group metrics by category: AC, DC, Battery, Solar, Thermal, Internal
- Change inactive chips to outlined (transparent bg + colored border), fill on selection
- Add a pin/favorite system — users can save a default selection of comparison fields
- Reduce vertical footprint: collapsible or dropdown-based

---

## Phase 8: State-Aware Ambient UI

**Effort:** Medium  
**Dependencies:** Phase 2 (semantic colors)  
**Files:** `analytics/src/styles/base.css`, `analytics/src/App.tsx`, `analytics/src/hooks/useLiveTelemetry.ts`

- When battery is critical (<20%), add a subtle amber/red environmental tint
- When solar surplus is detected, shift to cool cyan accent
- When fault is detected, show pulsing edge indicators
- Keep all effects subtle — 10–15% opacity shifts, not banner alerts
- Use CSS custom properties to toggle ambient tints

---

## Phase 9: Chart Interaction Depth

**Effort:** Medium  
**Dependencies:** Phase 3  
**Files:** `analytics/src/components/DenseTimeSeries.tsx`, `analytics/src/lib/time.ts`

- Add crosshair synchronization across all charts on the page (shared timeline hover)
- Support zoom-to-range by dragging on a chart
- Add metric isolation — double-click a series to solo it
- Add event annotations — mark significant events (peak load, grid outage, SOC milestones)

---

## Phase 10: Mobile & Density Optimization

**Effort:** Medium  
**Dependencies:** Phase 1  
**Files:** `analytics/src/styles/base.css`, `analytics/src/App.tsx`

- Audit responsive breakpoints — ensure charts are readable on phone-sized screens
- Increase tap target sizes for time range selectors, toggle pills, and chips
- Add swipe gesture support for navigating between time presets
- Validate the existing `data-analytics-density="compact"` styles work across all panels
- Hide less critical elements (Field Comparison, detailed stats) behind an expandable section on mobile

---

## Phase 11: Alerts, Cost Tracking & Energy Insights

**Effort:** Large  
**Dependencies:** Phase 4 (system summary infrastructure)  
**Files:** `analytics/src/App.tsx`, `analytics/src/hooks/`, `analytics/src/lib/`

- Add threshold-based custom alerts with ntfy or in-app banners (battery <20%, solar spike, anomalous consumption)
- Implement real-time cost calculation: $/hour grid spend based on AC input power
- Add savings dashboard: money saved from solar vs. grid over selected window
- Show trend arrows (↑↓) on KPIs indicating if metrics improved or worsened
- Add a "System Efficiency Index" combining load, solar share, and battery usage

---

## Phase 12: Advanced Long-Term Features

**Effort:** Large  
**Dependencies:** Multiple prior phases  
**Files:** Multiple

- **Power flow topology diagram:** Animated Solar → Battery → Inverter → Load visualization
- **Operational modes:** Basic (clean flow + battery + runtime) / Advanced (full telemetry) / Diagnostic (raw sensors)
- **Weather integration:** Pull local forecast, show expected solar generation
- **Solar forecast + optimization:** "Cloudy tomorrow — charge tonight during off-peak"
- **Comparison mode:** Compare this week vs. last week, this month vs. last month
- **Historical comparison overlays:** Overlay previous period data on current charts
- **Export:** CSV/PDF report generation
- **AI insights:** Predictive trend lines, anomaly detection, "Reduce AC by 2°C saves $15/mo"

---

## Summary Table

| Phase | Title | Effort | Dependencies | Impact |
|-------|-------|--------|--------------|--------|
| 1 | Visual Hierarchy & Layout Polish | Small | None | High |
| 2 | Semantic Color System | Small | None | High |
| 3 | Chart Improvements — Solar Input & Toggling | Medium | Phase 2 | High |
| 4 | Actionable System Summary | Medium | None | High |
| 5 | Tooltips & Plain-Language Labels | Small | None | Medium |
| 6 | Time Controls & Playback | Medium | None | Medium |
| 7 | Field Comparison Redesign | Medium | None | Medium |
| 8 | State-Aware Ambient UI | Medium | Phase 2 | Medium |
| 9 | Chart Interaction Depth | Medium | Phase 3 | Medium |
| 10 | Mobile & Density Optimization | Medium | Phase 1 | Medium |
| 11 | Alerts, Cost Tracking & Energy Insights | Large | Phase 4 | High |
| 12 | Advanced Long-Term Features | Large | Multiple | Variable |

**Total:** 12 phases — 5 small, 6 medium, 1 large — structured to build incrementally with quick wins first.