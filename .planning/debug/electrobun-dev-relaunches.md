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

## Resolution
- root_cause: Electrobun's built-in `dev --watch` watches the entire `assets` directory because two copied icon files live there, so unrelated/spurious events for derived icon sizes such as `assets/icon-16.png` trigger full desktop rebuilds and relaunches.
- fix: Replaced delegation to `electrobun dev --watch` with a precise watcher in `scripts/dev-desktop.mjs` that runs plain `electrobun dev` and restarts only for `src/bun`, `src/mainview`, `assets/icon.ico`, `assets/icon.png`, Electrobun config, and Electrobun hook scripts. Kept generated-output watch ignores in config as defensive hardening.
- verification: `node --check scripts/dev-desktop.mjs`; `.\node_modules\.bin\tsc.exe --noEmit`; short `node scripts/dev-desktop.mjs --watch-electrobun` launch with `.dev-data/logs/desktop-dev.log` tail inspected.
- files_changed: scripts/dev-desktop.mjs, electrobun.config.ts, .planning/debug/electrobun-dev-relaunches.md
