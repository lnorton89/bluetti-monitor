<!-- GSD:project-start source:PROJECT.md -->
## Project

**Bluetti Monitor**

Bluetti Monitor is a personal-first monitoring stack for a Bluetti AC500 that combines a local desktop shell, a web dashboard, and a telemetry pipeline backed by MQTT and FastAPI. It is meant to give me a reliable, understandable view of power, battery, and device state from my desktop today, while growing into something I can also use easily from my phone on my local network.

**Core Value:** I can reliably see the current state of my Bluetti system in one place without fighting brittle setup, unclear ownership between components, or hard-to-interpret telemetry.

### Constraints

- **Tech stack**: Keep the current Bun desktop shell, React dashboard, and Python FastAPI API unless there is a strong migration payoff — major rewrites would slow down the actual monitoring improvements
- **Bluetooth environment**: BLE access is Windows-first and currently depends on the Node bridge plus its helper tooling — the migration must respect that runtime reality
- **LAN-first access**: Mobile access should work in a browser on the local network before any remote/cloud access is considered
- **Hardware-driven telemetry**: Runtime and charging estimates must be derived from the AC500 fields that are actually available in live telemetry, not invented from unsupported data
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Overview
- This repository is a multi-runtime monitoring stack with a desktop shell, a Python API, a React dashboard, and a local workspace BLE-to-MQTT library.
- The top-level package is defined in `package.json` and uses Bun plus Electrobun for the desktop entrypoint.
- The main tracked source areas are `api/`, `dashboard/`, and `src/`.
- A local workspace dependency lives at `lib/bluetti-mqtt-node`, and it is now tracked as a git submodule so the app can pin a specific library revision.
## Root Runtime And Tooling
- `package.json`
- `tsconfig.json`
- `electrobun.config.ts`
- `docker-compose.yml`
## Desktop Shell
- Language: TypeScript
- Runtime: Bun with Electrobun
- Key files:
- Responsibilities:
## API Service
- Language: Python 3.12
- Frameworks and libraries:
- Key files:
- Storage:
- Protocols:
## Dashboard
- Language: TypeScript
- Framework: React 19
- Bundler/dev server: Vite 8
- Router: `react-router-dom`
- Data layer:
- Visualization and UI libraries:
- Key files:
## Workspace BLE Library
- Package: `lib/bluetti-mqtt-node/package.json`
- Language: TypeScript targeting Node.js `>=22`
- Purpose:
- Key tracked-by-reference files in the local workspace:
- Native helper:
## Build And Packaging
- Docker builds:
- Desktop packaging:
## Notable Generated Or Local-Only Areas
- `build/` contains generated desktop output.
- `.dev-data/` stores local development state like the SQLite DB.
- `dashboard/dist/` is generated frontend build output.
- `api/.venv/` is a local Python virtual environment.
- `lib/bluetti-mqtt-node/dist/` and `lib/bluetti-mqtt-node/artifacts/` are generated outputs from the local library.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## General Style
- The repository uses TypeScript for the desktop shell, dashboard, and BLE library, plus Python for the API.
- Code style appears hand-written and pragmatic rather than formatter-enforced by a shared root config.
- The tracked code favors readable names and explicit constants over deep abstraction.
## TypeScript Conventions
- Root TS config in `tsconfig.json` enables strict checks such as:
- Common style patterns:
- Examples:
## React Conventions
- Component style is function-component based.
- Hooks are used directly in pages and stores without wrapper-heavy patterns.
- Styling is mixed:
- State management split:
- Routing is centralized in `dashboard/src/App.tsx`.
## Data And Domain Conventions
- Field metadata is centralized in `dashboard/src/lib/fields.ts`.
- Unknown fields are tolerated and given a fallback label/category instead of throwing.
- Boolean-like device values are normalized from strings such as `True`, `true`, `1`, and `ON`.
- Device state is generally represented as:
## Python Conventions
- `api/main.py` uses plain functions plus a small class for WebSocket connection management.
- Database access is synchronous and simple:
- The code favors standard-library helpers and straightforward SQL strings rather than an ORM.
## Logging And Error Handling
- Desktop and workspace library code log status aggressively with labeled prefixes like `[desktop:api]` and `[bluetooth]`.
- The BLE library uses typed domain errors such as:
- Expected device-level failures are usually downgraded to warnings or control-flow results instead of crashing the loop.
- The dashboard generally does not show deep error states beyond connection status and loading spinners.
## File And Module Patterns
- Barrel exports:
- One large file for orchestration:
- Concern-based folders:
## Testing And Mocking Conventions
- Frontend tests prefer mock mode over full-stack integration in `dashboard/tests/*.spec.ts`.
- The dashboard mock layer is isolated in `dashboard/src/lib/mock.ts`.
- The workspace library test runner imports individual test files from `lib/bluetti-mqtt-node/test/run-all.mjs`.
## Convention Gaps
- There is no tracked Prettier config, shared ESLint config at the repo root, or Python lint config.
- Quote style differs between the dashboard and the Bun/library code.
- The checked-in structure suggests multiple local-only/generated directories that developers must distinguish manually.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Shape
- The repository is organized as a pipeline:
## Main Runtime Entry Points
- Desktop shell:
- Desktop loading view:
- API service:
- Dashboard frontend:
- BLE/MQTT bridge package:
## Desktop Orchestration Layer
- `src/bun/index.ts` is the control tower for the desktop app.
- It detects whether it is running against local source trees or a Docker-only setup.
- In local dev mode it:
- It also starts the device-side BLE service asynchronously through `src/bun/bluetooth.ts`.
## Bluetooth And MQTT Bridge Architecture
- `src/bun/bluetooth.ts` is a thin adapter around the local workspace package.
- `lib/bluetti-mqtt-node/src/app/server.ts`
- `lib/bluetti-mqtt-node/src/app/device-handler.ts`
- `lib/bluetti-mqtt-node/src/mqtt/client.ts`
## API Architecture
- `api/main.py` is a single-module service with three responsibilities mixed together:
- Data flow:
## Dashboard Architecture
- `dashboard/src/App.tsx`
- `dashboard/src/store/ws.ts`
- `dashboard/src/lib/api.ts`
- Page-level architecture:
## State Boundaries
- Live state:
- Historical state:
- Mock state:
## Routing And Surface Boundaries
- Browser routes:
- Backend routes:
- Container routing:
## Architectural Strengths
- Clear top-level separation between desktop shell, API, dashboard, and BLE library.
- Good adapter pattern at the desktop edge through `src/bun/bluetooth.ts`.
- Dashboard mock mode makes frontend work less dependent on hardware.
- BLE polling logic in `lib/bluetti-mqtt-node/src/app/device-handler.ts` has explicit backoff and telemetry tracking.
## Architectural Tradeoffs
- The Python API is compact but highly coupled because persistence, transport, caching, and HTTP surface all live in `api/main.py`.
- The dashboard has reusable helpers, but much of the UI composition remains page-local rather than feature-module based.
- The desktop bootstrap path in `src/bun/index.ts` owns many responsibilities and runtime decisions in one file.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
