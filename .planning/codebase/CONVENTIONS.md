# Coding Conventions

## General Style

- The repository uses TypeScript for the desktop shell, dashboard, and BLE library, plus Python for the API.
- Code style appears hand-written and pragmatic rather than formatter-enforced by a shared root config.
- The tracked code favors readable names and explicit constants over deep abstraction.

## TypeScript Conventions

- Root TS config in `tsconfig.json` enables strict checks such as:
  - `strict`
  - `noUnusedLocals`
  - `noUnusedParameters`
  - `noPropertyAccessFromIndexSignature`
- Common style patterns:
  - Single quotes in the dashboard code
  - Double quotes in the desktop and library code
  - Trailing commas used frequently
  - Named constants for timing and port values
- Examples:
  - `src/bun/index.ts` defines startup constants like `STACK_READY_TIMEOUT_MS`
  - `src/bun/bluetooth.ts` defines polling and retry constants near the top
  - `lib/bluetti-mqtt-node/src/app/device-handler.ts` uses typed interfaces and normalized option helpers

## React Conventions

- Component style is function-component based.
- Hooks are used directly in pages and stores without wrapper-heavy patterns.
- Styling is mixed:
  - Large shared CSS in `dashboard/src/index.css`
  - Inline style objects in `dashboard/src/components/ui.tsx` and page components
- State management split:
  - React Query for request/response data in `dashboard/src/pages/Charts.tsx`
  - Zustand for long-lived live state in `dashboard/src/store/ws.ts`
- Routing is centralized in `dashboard/src/App.tsx`.

## Data And Domain Conventions

- Field metadata is centralized in `dashboard/src/lib/fields.ts`.
- Unknown fields are tolerated and given a fallback label/category instead of throwing.
- Boolean-like device values are normalized from strings such as `True`, `true`, `1`, and `ON`.
- Device state is generally represented as:
  - `Record<string, FieldValue>` for one device
  - `Record<string, DeviceState>` for all devices

## Python Conventions

- `api/main.py` uses plain functions plus a small class for WebSocket connection management.
- Database access is synchronous and simple:
  - `db_connect`
  - `db_init`
  - `db_insert`
- The code favors standard-library helpers and straightforward SQL strings rather than an ORM.

## Logging And Error Handling

- Desktop and workspace library code log status aggressively with labeled prefixes like `[desktop:api]` and `[bluetooth]`.
- The BLE library uses typed domain errors such as:
  - `DeviceBusyError`
  - `CommandTimeoutError`
  - `ModbusError`
  - `ParseError`
- Expected device-level failures are usually downgraded to warnings or control-flow results instead of crashing the loop.
- The dashboard generally does not show deep error states beyond connection status and loading spinners.

## File And Module Patterns

- Barrel exports:
  - `lib/bluetti-mqtt-node/src/index.ts`
- One large file for orchestration:
  - `src/bun/index.ts`
  - `api/main.py`
  - `dashboard/src/pages/Overview.tsx`
- Concern-based folders:
  - `dashboard/src/lib/`
  - `dashboard/src/store/`
  - `lib/bluetti-mqtt-node/src/bluetooth/`
  - `lib/bluetti-mqtt-node/src/devices/`

## Testing And Mocking Conventions

- Frontend tests prefer mock mode over full-stack integration in `dashboard/tests/*.spec.ts`.
- The dashboard mock layer is isolated in `dashboard/src/lib/mock.ts`.
- The workspace library test runner imports individual test files from `lib/bluetti-mqtt-node/test/run-all.mjs`.

## Convention Gaps

- There is no tracked Prettier config, shared ESLint config at the repo root, or Python lint config.
- Quote style differs between the dashboard and the Bun/library code.
- The checked-in structure suggests multiple local-only/generated directories that developers must distinguish manually.
