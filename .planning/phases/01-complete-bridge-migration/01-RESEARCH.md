# Phase 1: Complete Bridge Migration - Research

**Researched:** 2026-04-02
**Domain:** Windows-first local stack orchestration for a browser-first Bluetti monitoring flow
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- The canonical daily-use flow is browser-first, not desktop-wrapper-first.
- Phase 1 should introduce one repo-level npm command that launches the supported monitoring flow end to end.
- That command should auto-discover the AC500 and fall back to the known MAC address if discovery fails.
- The command should not force-open a browser window; it should start the stack and print the relevant local and LAN URLs.
- The repo-level npm command is the primary supported startup path for this app.
- The standalone `bluetti-mqtt-node` CLI should remain available as an advanced/manual fallback for debugging and package-level use, but not as an equal first-class app workflow.
- The app's normal startup path should exercise the package through its CLI-style entrypoint rather than the current in-process bridge helper integration.
- Phase 1 is complete when docs and commands tell one consistent startup story with `bluetti-mqtt-node` as the only supported bridge path.
- Phase 1 must include one repeatable smoke test that proves startup and live telemetry flow.
- Phase 1 must also include a scripted local verification command so the migration can be re-checked without ad hoc manual steps.
- Keep the FastAPI service in Python for now; only the old Python poller path and its references should be removed in this phase.
- If migration-blocking legacy residue is easy to remove while aligning the new startup path, it can be removed as part of this phase as long as it does not expand into a Python API rewrite.

### the agent's Discretion
- Exact naming and shape of the new repo-level startup and verification scripts.
- How startup output presents local versus LAN URLs.
- Whether the CLI wrapper uses config files, generated arguments, or another thin orchestration layer, as long as it follows the decisions above.

### Deferred Ideas (OUT OF SCOPE)
- Full removal of Python from the project.

</user_constraints>

<research_summary>
## Summary

The most stable migration path is to make the containerized API and dashboard the canonical app surface, then run `bluetti-mqtt-node` on the Windows host as the bridge into Mosquitto. That lines up with the real runtime constraints already documented in the repo: BLE stays on the host, while the browser-visible dashboard and API are already packaged for Docker and LAN access on ports `8540` and `8000`.

The current conflict is not missing capability, but conflicting startup stories. `README.md` still teaches a manual host poller flow, `src/bun/index.ts` still centers a Vite-on-`5173` desktop path, and `src/bun/bluetooth.ts` imports the package internals directly instead of exercising the package like an external CLI consumer. The standard fix is to create a repo-local orchestration command that shells out to the already-built local CLI binary and treats the desktop wrapper as secondary convenience tooling.

**Primary recommendation:** Add Node-based repo scripts under `scripts/monitor/` that own `docker compose up -d`, bridge CLI launch, readiness checks, fallback-device resolution, and local/LAN URL output; then update docs and the optional desktop wrapper to point at that browser-first flow.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js CLI scripts (`.mjs`) | Existing repo runtime | Cross-process orchestration, readiness checks, LAN URL printing | Works naturally with npm commands and with the workspace CLI binaries already linked into `node_modules/.bin` |
| Docker Compose v2 | Existing repo runtime | Run Mosquitto, FastAPI, and the nginx-served dashboard | Already defines the LAN-friendly app surface on ports `1883`, `8000`, and `8540` |
| `bluetti-mqtt-node` local bin | `0.1.0` submodule package | Host-side BLE and MQTT bridge | Matches the future published package contract and avoids app-specific bridge internals |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Built-in `fetch` in Node/Bun | Existing runtime | Poll API/dashboard readiness and verify smoke-test endpoints | Use instead of adding a new HTTP client dependency to root scripts |
| `os.networkInterfaces()` | Existing Node API | Compute LAN URLs to print for browser access | Use for startup output without hardcoding the machine IP |
| Existing Playwright suite | Existing repo tooling | Catch dashboard regressions while migration scripts change URLs and startup assumptions | Reuse as the fast UI regression layer alongside the new smoke verifier |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Browser-first Docker-backed flow | Desktop wrapper as canonical launcher | Keeps the current `5173` split and fights the user's explicit browser/LAN preference |
| CLI invocation through `node_modules/.bin` or `npm exec` | Direct imports from `src/bun/bluetooth.ts` | Direct imports are convenient in-app, but they do not validate the package surface the app is supposed to migrate to |
| Dedicated `scripts/monitor/*.mjs` orchestration | Large one-line `package.json` shell commands | Inline shell becomes brittle on Windows and is hard to test or reuse from verification scripts |

**Installation:**
```bash
npm install
git submodule update --init --recursive
docker compose up -d
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
scripts/
`-- monitor/
    |-- shared.mjs
    |-- start.mjs
    `-- verify.mjs
```

### Pattern 1: Docker-backed app surface + host bridge
**What:** Treat `docker-compose.yml` as the app surface for `mosquitto`, `api`, and `dashboard`, and launch the bridge separately on the Windows host.
**When to use:** Daily monitoring and browser/LAN access, where BLE still must stay on the host.

### Pattern 2: Repo command wraps the package CLI
**What:** The root npm command should spawn the package executable rather than importing package internals.
**When to use:** Any migration where the app is supposed to validate the package contract it will eventually consume after publish.

### Pattern 3: Shared orchestration helpers for start + verify
**What:** Keep device resolution, URL constants, and process helpers in a shared module so `monitor:start` and `monitor:verify` do not drift.
**When to use:** Multi-command flows that need the same broker/API/dashboard assumptions and fallback MAC behavior.

### Anti-Patterns to Avoid
- **Keeping `5173` as the public app URL:** `5173` is a local Vite dev concern, not the stable LAN/browser surface.
- **Documenting two equal startup stories:** A migration stays half-finished when manual host commands and repo commands are both presented as first-class.
- **Hiding orchestration in the desktop shell only:** That makes browser-first use and scripted verification much harder than they need to be.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BLE discovery logic | New custom discovery implementation in the app repo | Existing `bluetti-mqtt-node` discovery/runtime behavior | The package already owns Windows helper resolution and discovery behavior |
| App readiness checks | Manual sleeps in npm scripts | Shared polling helper that hits `8000` and `8540` explicitly | Sleeps are fragile across Windows and Docker startup timing |
| LAN URL discovery | Hardcoded local IPs in docs or scripts | `os.networkInterfaces()`-based printing | Local IPs change; the app should compute and display them |
| Cross-process orchestration | Giant shell strings in `package.json` | Small Node `.mjs` scripts under `scripts/monitor/` | Easier cleanup, logging, argument handling, and reuse from verification |

**Key insight:** The repo already contains most of the runtime pieces. The migration win comes from composing them consistently, not from inventing another bridge layer.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Public URL drift between dev and packaged flows
**What goes wrong:** Scripts or docs wait on `http://127.0.0.1:5173` even when the user-facing dashboard is actually the Docker/nginx app on `8540`.
**How to avoid:** Treat `8540` as the canonical browser URL for daily use and keep `5173` explicitly scoped to local dashboard development.

### Pitfall 2: App-only integration path hides package problems
**What goes wrong:** The desktop shell works through direct imports, but the published-style CLI path is still untested or inconsistently wired.
**How to avoid:** Make the repo-level monitor command spawn the package bin and keep direct imports secondary.

### Pitfall 3: Verification becomes ad hoc
**What goes wrong:** Migration appears complete in docs, but nobody can quickly re-run a smoke check to prove the bridge still reaches MQTT/API/dashboard.
**How to avoid:** Add `monitor:verify` with explicit checks for bridge publish, API data visibility, and dashboard reachability.
</common_pitfalls>

<code_examples>
## Code Examples

### Service readiness polling
```ts
// Source: src/bun/index.ts
async function waitForUrl(url: string, label: string, expectedText?: string) {
  const deadline = Date.now() + STACK_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isUrlReady(url, expectedText)) return;
    await Bun.sleep(STACK_POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for the ${label} at ${url}.`);
}
```

### Fallback MAC behavior
```ts
// Source: src/bun/bluetooth.ts
const FALLBACK_MAC = "24:4C:AB:2C:24:8E";
```

### Package CLI contract
```text
# Source: lib/bluetti-mqtt-node/README.md
npm run bluetti-mqtt -- --broker mqtt://127.0.0.1:1883 --interval 5 24:4C:AB:2C:24:8E
```
</code_examples>

<sota_updates>
## State of the Art (2024-2025)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Copied local library folder | Git submodule for `lib/bluetti-mqtt-node` | 2026-04-02 | The app can now pin a real package revision instead of relying on an opaque snapshot |
| App-specific in-process bridge story | Package-CLI-first migration target | Current milestone | The repo should validate the package contract it plans to publish |
| Desktop/Vite-centered startup story | Browser/LAN-first dashboard on `8540` | Current milestone | Daily use should target the route that actually works from another device on the LAN |
</sota_updates>

<open_questions>
## Open Questions

1. **Should the root monitor command run the API locally or in Docker?**
   - Recommendation: Plan around Docker-backed API/dashboard for the canonical flow and leave local API/Vite startup to desktop/dev tooling.

2. **How much of the desktop wrapper should be aligned in Phase 1?**
   - Recommendation: Fix the conflicting URL/bootstrap assumptions and make the docs explicit; deeper wrapper consolidation can wait if it risks delaying migration completion.
</open_questions>

## Validation Architecture

- Use the existing dashboard Playwright suite as the fast UI regression layer during migration work.
- Add a repo-local `monitor:verify` smoke command as the phase-specific bridge/API/dashboard validator.
- Treat successful phase completion as requiring both `dashboard:test` and `monitor:verify`.

<sources>
## Sources

### Primary (HIGH confidence)
- `README.md`
- `package.json`
- `docker-compose.yml`
- `src/bun/index.ts`
- `src/bun/bluetooth.ts`
- `lib/bluetti-mqtt-node/README.md`
- `lib/bluetti-mqtt-node/package.json`
- `dashboard/src/lib/api.ts`
- `dashboard/playwright.config.ts`
- `dashboard/tests/*.spec.ts`

### Secondary (MEDIUM confidence)
- `node_modules/.bin/bluetti-mqtt-node.exe` and sibling local bins

### Tertiary (LOW confidence - needs validation)
- None
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: repo-local orchestration of Docker + host CLI
- Ecosystem: Node scripts, Docker Compose, local workspace bin execution
- Patterns: browser-first startup, shared runtime helpers, scripted smoke verification
- Pitfalls: URL drift, app-only integration, ad hoc validation

**Confidence breakdown:**
- Standard stack: HIGH
- Architecture: HIGH
- Pitfalls: HIGH
- Code examples: HIGH

**Research date:** 2026-04-02
**Valid until:** 2026-05-02
</metadata>

---

*Phase: 01-complete-bridge-migration*
*Research completed: 2026-04-02*
*Ready for planning: yes*
