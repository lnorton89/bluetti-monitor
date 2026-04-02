# Concerns

## High Priority Risks

- Local workspace dependency is effectively invisible to git.
  - Root `package.json` depends on `lib/bluetti-mqtt-node` as a workspace package.
  - `.gitignore` contains `/lib/bluetti-mqtt-node/`.
  - `git ls-files` does not show any files from `lib/bluetti-mqtt-node/`.
  - Result: a core runtime dependency can drift locally without review, history, or reproducible checkout behavior.

- The non-local desktop bootstrap path appears to target the wrong dashboard URL.
  - `src/bun/index.ts` defines `DASHBOARD_URL` as `http://127.0.0.1:5173`.
  - In the non-local branch it runs full Docker startup, then still waits for and loads `DASHBOARD_URL`.
  - `docker-compose.yml` exposes the dashboard container on host port `8540`, not `5173`.
  - Result: packaged or Docker-only startup likely fails or waits on the wrong service address.

## Medium Priority Risks

- The API is a single large module in `api/main.py`.
  - Persistence, MQTT ingestion, cache management, REST endpoints, and WebSocket broadcasting are all coupled together.
  - This makes testing, reuse, and isolated refactors harder.

- The API uses synchronous SQLite operations inside an async service.
  - `api/main.py` performs blocking sqlite3 access for every insert and query.
  - Under heavier message throughput or many HTTP clients, this can become a bottleneck.

- CORS is fully open in `api/main.py`.
  - `allow_origins=["*"]`, `allow_methods=["*"]`, and `allow_headers=["*"]`.
  - That may be fine for local development, but it is broad for any environment beyond a trusted local stack.

- Live state exists only in memory on the API side.
  - `latest` in `api/main.py` is rebuilt from incoming MQTT traffic after process start.
  - A restart loses the immediate cache until fresh messages arrive.

- The dashboard contains a theme store that may not be wired into the app.
  - `dashboard/src/store/theme.ts` sets document attributes and local storage.
  - The tracked routing shell in `dashboard/src/App.tsx` does not reference that store.
  - This may be dead code or a partially integrated feature.

## Operational Risks

- The desktop shell owns many responsibilities in `src/bun/index.ts`.
  - Docker process management
  - Python environment setup
  - Uvicorn startup
  - Vite startup
  - Browser window lifecycle
  - Error page rendering
  - Background BLE service startup
  - This makes the file a fragile hotspot for startup regressions.

- Bluetooth startup has a hard-coded fallback MAC in `src/bun/bluetooth.ts`.
  - Useful for local development, but risky if the fallback is stale or not portable to another environment.

- The BLE helper path assumes Windows-first behavior.
  - `src/bun/bluetooth.ts` resolves a Windows helper executable and a .NET project path.
  - Cross-platform claims should be validated carefully.

## Testing Gaps

- No tracked automated tests cover `api/main.py`.
- No tracked automated tests cover `src/bun/index.ts`.
- The only tracked automated tests are dashboard Playwright tests.
- The BLE library seems to have tests, but they are hidden by the ignored workspace directory.

## Repository Hygiene Issues

- Generated and local-only directories coexist near source trees:
  - `build/`
  - `.dev-data/`
  - `dashboard/dist/`
  - `api/.venv/`
  - `lib/bluetti-mqtt-node/dist/`
  - `lib/bluetti-mqtt-node/artifacts/`
- Developers need to know which directories are source of truth and which are disposable outputs.

- There is a `TODO` file pattern in `.gitignore`, which can make local planning notes easy to miss during collaboration.

## Suggested Follow-Up Areas

- Bring `lib/bluetti-mqtt-node/` under version control or move it to a separately versioned repository with a clear dependency contract.
- Split `api/main.py` into transport, persistence, and HTTP modules.
- Fix the non-local dashboard URL path in `src/bun/index.ts`.
- Add API tests and at least one startup/integration test for the desktop orchestration path.
