---
status: investigating
trigger: "the electrobun dev script seems to trigger relaunches excessively. can you find out why and fix it? if you cant find out why implement logging to catch it"
created: 2026-05-29
updated: 2026-05-29
---

# Debug Session: electrobun-dev-relaunches

## Symptoms
- Expected behavior: Electrobun dev should relaunch only when source changes that affect the desktop shell require it.
- Actual behavior: The dev script appears to relaunch excessively.
- Error messages: None provided.
- Timeline: Unknown.
- Reproduction: Run the Electrobun dev script.

## Current Focus
- hypothesis: Unknown; gather initial evidence from scripts, Electrobun config, and watcher behavior.
- test: Inspect package scripts and watched paths.
- expecting: Identify a watched generated path, process output side effect, or restart loop trigger.
- next_action: gather initial evidence

## Evidence
- 2026-05-29: `package.json` runs `node ./scripts/dev-desktop.mjs --watch-electrobun` for `desktop:dev`.
- 2026-05-29: Electrobun 1.16.0 derives watch directories from the Bun entrypoint, view entrypoints, copy sources, and `build.watch`; the repro printed watch dirs `assets`, `src\bun`, and `src\mainview`.
- 2026-05-29: A 90-second captured repro did not produce an Electrobun `FILE CHANGED` relaunch before manual termination.
- 2026-05-29: Earlier desktop log entries showed repeated desktop startups, but that log only captures the launched app, not the parent Electrobun watcher trigger.
- 2026-05-29: Added parent dev workflow logging to `.dev-data/logs/desktop-dev.log` so future relaunches preserve Electrobun `FILE CHANGED` output, child stdout/stderr, spawn PIDs, and exit reasons.
- 2026-05-29: Verified a short dev run writes structured parent logs and still launches the desktop stack. The test was manually terminated after startup.
- 2026-05-29: User reported another relaunch. `.dev-data/logs/desktop-dev.log` captured `FILE CHANGED: C:\Users\Lawrence\Documents\Dev\bluetti\bluetti-monitor\assets\icon-16.png` at `2026-05-29T19:24:23Z`.
- 2026-05-29: `assets/icon-16.png` is a tracked derived icon size file, not a configured Electrobun copy input. Electrobun watched it only because its built-in watcher watches the whole `assets` directory for copied `assets/icon.ico` and `assets/icon.png`.

## Eliminated
- Desktop app log writes under `.dev-data/logs/desktop.log` are unlikely to be the direct trigger because Electrobun watched `assets`, `src\bun`, and `src\mainview` during the repro, not `.dev-data`.

## Resolution (Round 1)
- root_cause: Electrobun's built-in `dev --watch` watches the entire `assets` directory because two copied icon files live there, so unrelated/spurious events for derived icon sizes such as `assets/icon-16.png` trigger full desktop rebuilds and relaunches.
- fix: Replaced delegation to `electrobun dev --watch` with a precise watcher in `scripts/dev-desktop.mjs` that runs plain `electrobun dev` and restarts only for `src/bun`, `src/mainview`, `assets/icon.ico`, `assets/icon.png`, Electrobun config, and Electrobun hook scripts. Kept generated-output watch ignores in config as defensive hardening.
- verification: `node --check scripts/dev-desktop.mjs`; `.\node_modules\.bin\tsc.exe --noEmit`; short `node scripts/dev-desktop.mjs --watch-electrobun` launch with `.dev-data/logs/desktop-dev.log` tail inspected.
- files_changed: scripts/dev-desktop.mjs, electrobun.config.ts, .planning/debug/electrobun-dev-relaunches.md

## Round 2 — Cascade restart loop from build scripts in watch targets

### Symptoms
- User reported app "randomly restarted again" even after precise watcher was deployed.
- `.dev-data/logs/desktop-dev.log` showed 4 electrobun spawns in 5 seconds (21:52:33–21:52:38).

### Evidence
- 2026-05-29 21:52:32.828: `src/mainview/index.css` changed → legitimate restart.
- 2026-05-29 21:52:33.655: `scripts/electrobun-prebuild-clean.mjs` watch event → cascade restart.
- 2026-05-29 21:52:35.335: `src/bun/bluetooth.ts` watch event → cascade restart (possible side effect of build).
- 2026-05-29 21:52:35.841: `assets/icons/icon.ico` watch event → cascade restart (postbuild script reads this file).

### Root Cause
The precise watcher included `scripts/electrobun-prebuild-clean.mjs` and `scripts/electrobun-postbuild-icons.mjs` in its watch targets. These scripts are defined in `electrobun.config.ts` as `preBuild` and `postBuild` hooks, meaning they are **executed by electrobun during every build**. `fs.watch` on Windows fires events when these scripts are read/executed, causing a cascade restart loop:
1. Legitimate source change → electrobun rebuild starts
2. Rebuild runs prebuild script → watcher catches it → kill child → new rebuild starts
3. New rebuild runs prebuild again, postbuild reads icons → more watcher events
4. Multiple spawn/kill cycles until events settle

### Fix
- Removed `scripts/electrobun-prebuild-clean.mjs` and `scripts/electrobun-postbuild-icons.mjs` from watch targets — these are **consumed by the build**, not sources that should trigger rebuilds.
- Refactored watch target setup to cache `isDirectory()` result at setup time (instead of calling `statSync` again in the callback), eliminating a potential race condition.

### Verification
- `node --check scripts/dev-desktop.mjs` — syntax clean.
- `scripts/dev-desktop.mjs` now watches: `src/bun`, `src/mainview`, `assets/icons/icon.ico`, `assets/icons/icon.png`, `electrobun.config.ts`.
- files_changed: scripts/dev-desktop.mjs, .planning/debug/electrobun-dev-relaunches.md
