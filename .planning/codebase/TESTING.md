# Testing

## Current Testing Surface

- The tracked repository has frontend end-to-end coverage in `dashboard/tests/`.
- The local workspace BLE library also has a test suite under `lib/bluetti-mqtt-node/test/`, but that folder is not currently tracked by git.
- There are no tracked tests for the Python API in `api/`.
- There are no tracked tests for the Electrobun desktop shell in `src/`.

## Dashboard Tests

- Test framework:
  - Playwright via `dashboard/playwright.config.ts`
- Test files:
  - `dashboard/tests/dashboard.spec.ts`
  - `dashboard/tests/initial-layout.spec.ts`
- How tests run:
  - `dashboard/playwright.config.ts` starts `npm run dev -- --host 127.0.0.1 --port 4173`
  - Base URL is `http://127.0.0.1:4173`
  - Test URL includes `?mock=1`
- Coverage focus:
  - Layout rendering
  - Sidebar navigation
  - Charts page interaction
  - Raw data search
  - Screenshot capture before and after resize

## Dashboard Mock Strategy

- `dashboard/src/lib/api.ts` switches to mock mode when:
  - `VITE_MOCK_DATA === '1'`
  - Query param `mock=1` is present
- `dashboard/src/lib/mock.ts` provides:
  - Mock device state
  - Mock history series
  - Mock device and field discovery
- This makes frontend tests hardware-independent and backend-independent.

## Workspace Library Tests

- Package script:
  - `lib/bluetti-mqtt-node/package.json` uses `npm test`
- Test runner:
  - `lib/bluetti-mqtt-node/test/run-all.mjs`
- Test files include:
  - `lib/bluetti-mqtt-node/test/device-session.test.mjs`
  - `lib/bluetti-mqtt-node/test/mqtt-client.test.mjs`
  - `lib/bluetti-mqtt-node/test/device-handler.test.mjs`
  - `lib/bluetti-mqtt-node/test/helper-client.test.mjs`
  - `lib/bluetti-mqtt-node/test/struct.test.mjs`
- Validation script:
  - `lib/bluetti-mqtt-node/package.json` defines `validate` to run typecheck, tests, and helper build

## Missing Test Areas

- API service:
  - No unit tests for SQLite helpers in `api/main.py`
  - No integration tests for MQTT ingestion
  - No tests for REST endpoints or WebSocket snapshot behavior
- Desktop shell:
  - No tests for process orchestration in `src/bun/index.ts`
  - No tests for Bluetooth discovery or startup fallback logic in `src/bun/bluetooth.ts`
- Cross-service integration:
  - No tracked automated tests that exercise MQTT -> API -> dashboard end to end

## Tooling Signals

- Root script `npm run dashboard:test` delegates to the dashboard Playwright suite.
- `.gitignore` excludes `dashboard/test-results/`, so screenshot and report artifacts are expected to be local only.
- The workspace BLE package uses a Node-based test runner rather than Bun's built-in test tooling.

## Practical Testing Workflow

- Fastest feedback loop:
  - Run dashboard Playwright tests in mock mode
- Hardware-aware validation:
  - Run the desktop shell locally and watch the live dashboard against a real AC500
- Service validation:
  - Start `api/main.py` with a live or simulated MQTT broker and hit REST/WS endpoints manually

## Testing Risk Summary

- Frontend confidence is stronger than backend or desktop confidence because the only tracked automated tests are UI-focused.
- The most complex operational code lives in the desktop bootstrap and BLE library, but only the library appears to have dedicated automated tests.
- Because the BLE library is ignored by git, its tests are easy to lose from the main repo review surface.
