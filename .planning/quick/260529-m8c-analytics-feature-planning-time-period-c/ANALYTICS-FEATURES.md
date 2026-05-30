# Analytics Feature Specification

**Date:** 2026-05-29
**Status:** Draft for review

---

## Feature A: Time-Period Comparison

### User Story
> As a Bluetti owner, I want to see how today's solar production or power consumption compares to yesterday or last week, so I can spot changes in system behavior.

### UI

A "Compare with" dropdown in the controls band, positioned after the range selector:

```
[Range: 24h  ▾]  [Compare with: None ▾]  [Refresh]
                        ├── None
                        ├── Yesterday
                        ├── Same day last week
                        └── Same range last week
```

When a comparison is active:
- Each chart panel renders its primary series normally AND an additional set of faded/dashed comparison series.
- Comparison series use the same color as the primary series but with reduced opacity (0.4) and a dashed stroke pattern.
- The legend shows both periods: "Total input" / "Total input (yesterday)".
- A small indicator badge appears in the controls band: "Comparing with yesterday"

### Data Flow

1. `App.tsx` computes a `comparisonSince` ISO timestamp based on the selected comparison option and primary `sinceIso`.
   - Yesterday: `sinceIso - 24h`, same duration
   - Same day last week: `sinceIso - 7d`, same duration
   - Same range last week: `sinceIso - 7d`, same duration
2. A second `useQuery` call fetches history for the comparison window (same fields, different `since`):
   ```ts
   queryKey: ['core-timeline-comparison', device, range.id, comparisonSince, fields]
   ```
3. The comparison timeline is merged into the rendering pipeline. `DenseTimeSeries` receives a new optional prop `comparisonSeries?: DenseSeries[]`.
4. Comparison data is cached separately and doesn't block the primary render; it appears once loaded.

### Rendering in DenseTimeSeries

- Add a `comparisonSeries` prop to `DenseTimeSeries`.
- When present, render the comparison lines below (or above) the primary lines using the same uPlot series config but with:
  - `stroke` at 40% opacity
  - `width` reduced by 1px
  - `dash` pattern `[5, 5]`
- The comparison timestamps array must match the primary bucket alignment. The history worker already buckets by timestamp; the comparison window's first bucket aligns with the primary window's first bucket offset by the comparison delta.

### Open Questions

| Question | Options | Recommendation |
|----------|---------|----------------|
| What about custom date ranges? | 1) Disable comparison, 2) Allow user to pick two ranges | Start with presets only; add custom comparison later |
| Show comparison on Field Comparison panel too? | 1) Yes, 2) No | No — keep Field Comparison simple, it's already dense |
| Cache strategy when switching away? | 1) Keep in memory, 2) Discard | Keep in React Query cache (stale time 5min) |

### Effort Estimate
- **DenseTimeSeries changes:** 1–2 hours
- **App.tsx wiring + ControlsBand:** 1–2 hours
- **Total:** ~3–4 hours

---

## Feature B: Chart Annotations / Notes

### User Story
> As a Bluetti owner, I want to add a note like "Washed clothes — high load" at a specific time on the chart, so I can later correlate events with power data.

### Data Model

```ts
interface Annotation {
  ts: number;        // Unix ms
  text: string;      // Note content
  color?: string;    // Optional marker color
  id: string;        // Unique ID (nanoid or crypto.randomUUID)
  created: number;   // Unix ms
}
```

Storage: `localStorage` key `analytics-annotations-{device}` → serialized `Annotation[]`.

### UI

**Adding a note:**
- Click on any chart point → a small "+" icon appears on hover → click → inline popover opens with a textarea and "Save" button.
- Alternatively: right-click on chart → "Add note at this time" context menu.

**Viewing notes:**
- Small circular dots on the chart at annotation timestamps (uPlot plugin).
- Hovering over a dot shows the note text in a tooltip.
- A collapsible "Notes" panel at the bottom of the page lists all notes in the visible time range, sorted by timestamp, with delete/edit buttons.

**Editing/Deleting:**
- Click a note marker → popover with edit form.
- Delete button in the notes list and popover.

### Rendering (uPlot Plugin)

Write a custom `annotationPlugin`:

```ts
function annotationPlugin(annotations: Annotation[], opts: { theme: string }) {
  return {
    hooks: {
      drawClear: (u: uPlot) => { /* clear annotation overlay */ },
      draw: (u: uPlot) => {
        // For each annotation in visible x-range:
        //   const cx = u.valToPos(ann.ts, 'x');
        //   const cy_top = u.bbox.top + 4;
        //   ctx.arc(cx, cy_top, 4, 0, Math.PI * 2);
        //   ctx.fillStyle = ann.color ?? '#fbbf24';
        //   ctx.fill();
      },
    },
  };
}
```

This is the same approach uPlot's own tooltip plugin uses — zero cost, fully controlled by React.

### Export Consideration
Annotations should be included in any CSV/PDF export as extra columns or a notes section.

### Effort Estimate
- **Annotation storage + UI:** 1–2 hours
- **uPlot plugin:** 1 hour
- **Notes panel:** 1 hour
- **Total:** ~3–4 hours

---

## Feature C: Export / Save Reports

### User Story
> As a Bluetti owner, I want to export the current analytics view as CSV (for spreadsheet analysis) or as an image/printout (for sharing or archiving), so I can analyze data offline or share it with others.

### Export Types

#### CSV Export
- Button in controls band: "Export CSV"
- Derives CSV from the current `timeline` array:
  - Header row from series labels + timestamp column
  - One row per bucket
  - Fields: timestamp (ISO), totalInput, totalOutput, netPower, dcInput1Power, dcInput1Voltage, etc.
- Uses `Blob` download pattern:
  ```ts
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `bluetti-analytics-${rangeId}-${date}.csv`;
  a.click();
  ```

#### PNG Export (per-chart)
- Add a small export icon (Download icon) to each `PanelHeader`.
- Uses `html-to-image` library:
  ```ts
  import { toPng } from 'html-to-image';
  const chartEl = document.getElementById(`chart-${panelId}`);
  const dataUrl = await toPng(chartEl);
  // trigger download
  ```
- Lightweight dep (~5KB gzip). Already widely used in React chart dashboards.
- Alternative: `dom-to-image-more` (more features, heavier). Start with `html-to-image`.

#### PDF / Print
- Add "Print report" button in controls band.
- Use `@media print` CSS to:
  - Hide controls, topbar, settings button
  - Show all panels in full width (no scroll)
  - Preserve chart colors
  - Add page header with date range and device name
- Trigger with `window.print()`.
- User chooses "Save as PDF" from the browser print dialog.

### Library Decision

| Library | Size | Maintenance | Works with uPlot |
|---------|------|-------------|-----------------|
| `html-to-image` | ~5KB gzip | Active | Yes (canvas-based) |
| `dom-to-image-more` | ~12KB gzip | Moderate | Yes |
| `html2canvas` | ~30KB gzip | Active but heavy | Yes |

**Recommendation:** `html-to-image` — minimal, well-maintained, works with canvas-based uPlot.

### Effort Estimate
- **CSV export:** 1 hour
- **PNG per-chart:** 1–2 hours
- **Print stylesheet:** 1 hour
- **Total:** ~3–4 hours

---

## Implementation Order & Prioritization

| Feature | Value | Effort | Risk | Priority |
|---------|-------|--------|------|----------|
| A. Time-period comparison | High — directly answers "how is my system doing vs. last week?" | ~3–4h | Low — reuses existing data pipeline and charting | **1** |
| C1. CSV export | High — enables offline/spreadsheet analysis instantly | ~1h | None | **2** |
| C2. PNG export | Medium — nice for quick sharing | ~1–2h | Low | **3** |
| B. Annotations | Medium — helps with root-causing patterns | ~3–4h | Low | **4** |
| C3. Print/PDF | Low — browser Print to PDF already works most of the time | ~1h | None | **5** |

## API Changes Required

- **None** for Features B and C (all client-side).
- **None** for Feature A (the existing `/history/{device}` endpoint already accepts arbitrary `since` parameters; parallel queries use the same API).

## Data Integrity

- Annotations stored in localStorage are device-scoped but not synced. Cross-device sync would require an API extension (future consideration).
- CSV export includes all visible data. Annotations can be embedded as a comment block at the top of the CSV file.

## Future Considerations

- **API-backed annotations** — store notes server-side so they survive cache clears and appear on any device.
- **Comparison stacking** — compare more than two periods simultaneously.
- **Scheduled exports** — email or ntfy-push daily CSV reports.
- **Shared report links** — generate a shareable URL that renders a specific view.

---

## Review Checklist

- [ ] Feature A scope matches user needs for trend comparison
- [ ] Feature B annotations are scoped to localStorage (no API change)
- [ ] Feature C uses `html-to-image` (lightest viable option)
- [ ] No API changes required for any feature
- [ ] Implementation order is clear and incremental
