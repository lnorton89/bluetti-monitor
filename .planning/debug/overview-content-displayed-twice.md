# Debug: overview page content reported as displayed twice

**Status:** Investigating — DOM evidence does not match the bug report under mock mode.

## Reported symptom

User says: "the overview page in the dashboard has its content displayed twice".

## Reproduction so far

- Server: `dashboard/` Vite dev on port 4173 (Playwright webServer).
- Mode: mock data via `?mock=1`.
- URL: `http://127.0.0.1:4173/?mock=1`.
- Browser: Playwright Chromium (desktop, default viewport).
- Capture: screenshot saved to `dashboard/test-results/debug-overview-full.png` (1280 x 1797) and full HTML dump to `dashboard/test-results/debug-overview.html`.

## DOM evidence

Programmatic counts taken from the rendered DOM after `networkidle`:

| Selector                                 | Count |
| ---------------------------------------- | ----- |
| `.overview-page`                         | 1     |
| `.device-section`                        | 1     |
| `.device-overview-header`                | 1     |
| `.device-header`                         | 1     |
| `.overview-report-section`               | 3     |
| `.hero-card` / `.live-power-card`        | 1     |
| `.live-power-hub`                        | 1     |
| `.detail-grid`                           | 2     |
| `.tile-grid`                             | 4     |
| `.switchboard-grid`                      | 1     |
| `.metric-tile`                           | 17    |
| `#root` immediate children               | 1     |
| `.card.surface-card.hero-card.live-power-card` | 1 |
| `.card.surface-card` (all surfaces)      | 7     |
| `.section-header` / `.section-title`     | 7     |

Unique content markers (each appears once): `Input Bus`, `Output Bus`, `AC Sensor Channels`, `Switchboard`, `Mode and Limits`, `Identity`, `AC Sensor Pairing`.

Metric tile arithmetic (17) is consistent: 1 essentials card (Battery Voltage) + 6 Input Bus tiles + 4 Output Bus tiles + 6 AC Sensor Channels tiles = 17. Other essentials cards (Generated Energy, AC Output Mode, Battery Window) drop out because their fields are missing from `mockState`.

## Conclusion

Under mock mode with a single AC500 device, the Overview page renders exactly once, with every section rendered exactly once. The DOM does not contain any duplicated content.

The reason the page is long (`1280 x 1797`) is that it intentionally stacks many vertically-arranged sections (live power card → essentials → power channels → configuration/identity → switchboard). That stacking is by design, not a bug.

## Likely explanations for the user's perception

1. **Multi-device live mode.** `Overview.tsx` loops `devices.map((deviceId) => <DeviceOverview ... />)`. In mock mode there is one device; in a real broker setup the user could have multiple devices and the page would correctly render one Overview block per device. If their MQTT front-end emits the same physical device twice (two IDs, different casing, or stale+pushed duplicates), they would see the full Overview body stacked twice — which would look like the bug description. **Strongest hypothesis.**
2. **The user is mistaken.** The page is intentionally tall, with many large sections. They may have seen the topology and assumed duplication.
3. **A visual stacking CSS issue.** No evidence in this DOM dump; `position: relative` and explicit `gap`/`grid-template-rows` rules in `index.css` did not show duplicated z-stacked content in the captured HTML.
4. **StrictMode flicker.** React StrictMode runs effects twice in dev, but does not double-render DOM nodes. Unlikely to be the cause.

## Recommended next steps

1. **Confirm the actual count of devices the user has connected.** Ask: how many physical Bluetti devices have they paired with `bluetti-mqtt-node`, and did they ever see two device entries in the dashboard sidebar `n devices` chip?
2. **If multiple devices is the cause**, decide whether the product should: (a) keep multi-device stacking and clarify the UX, or (b) collapse multiple devices into a single tabbed Overview and let Raw Data / Detail show per-device content.
3. **If multi-device is not the cause**, ask the user for a HarDc copy of their browser, or for the actual screenshot, or for a reproduce path with exact viewport/window size.
