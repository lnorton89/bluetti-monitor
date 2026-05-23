---
status: resolved
trigger: "Fix the CEF issue after switching Windows Electrobun builds from WebView2 to bundled CEF: CEF GPU helper burns about one full CPU core, chrome_debug.log reports GPU/process/profile errors, and the attempted chromiumFlags override does not remove the runtime child-process flags."
created: 2026-05-23
updated: 2026-05-23
---

# Symptoms

- Expected behavior: The Windows desktop app should run with bundled CEF without a helper process continuously consuming about one full CPU core at idle, and startup should not log repeated CEF GPU/profile failures.
- Actual behavior: `bun Helper.exe --type=gpu-process` consumes roughly one full CPU core continuously after startup. The app stack otherwise starts and telemetry flows.
- Error messages: `chrome_debug.log` contains `Cannot create profile at path ...\CEF\Partitions\default`, `GPU process exited unexpectedly: exit_code=-2147483645`, `Failed to create shared context for virtualization`, and `SharedImageManager::ProduceMemory: Trying to Produce a Memory representation from a non-existent mailbox.`
- Timeline: Started after switching Windows Electrobun config from WebView2/native renderer to bundled CEF and `defaultRenderer: "cef"` on 2026-05-23.
- Reproduction: Run `npm run desktop:dev` on Windows with Electrobun CEF enabled, inspect Task Manager or `Get-Process` CPU deltas for the CEF `bun Helper.exe --type=gpu-process`, then inspect `%LOCALAPPDATA%\dev.lawrence.bluetti-monitor\dev\CEF\chrome_debug.log`.

# Current Focus

- hypothesis: Electrobun 1.16.0 bundled CEF on Windows is unstable for this app/runtime: removing Electrobun's GPU defaults leaves CEF in a broken `--use-gl=disabled` GPU process path, while explicit software or hardware ANGLE either keeps the one-core spin or crashes in `libNativeWrapper.dll`.
- test: Verified the built runtime config, inspected live child process command lines, tested explicit CEF GPU-disable and hardware ANGLE variants, then reverted Windows to the native WebView2 renderer.
- expecting: Windows native/WebView2 avoids bundled CEF helper processes and removes the CEF GPU/profile failure path.
- next_action: complete

# Evidence

- timestamp: 2026-05-23T18:29:48Z
  source: desktop log
  finding: API startup, MQTT connection, dashboard Vite startup, BLE bridge startup, and telemetry polling all succeeded after the CEF switch.
- timestamp: 2026-05-23T18:29:48Z
  source: CEF chrome_debug.log
  finding: CEF logged profile creation and GPU failures: cannot create profile partition, GPU process exits, failed shared context virtualization, and missing shared image mailbox.
- timestamp: 2026-05-23T18:35:00Z
  source: process command-line inspection
  finding: Running CEF child processes still include `--use-gl=disabled`; one renderer includes `--disable-gpu-compositing` despite project config setting `"disable-gpu": false` and `"disable-gpu-compositing": false`.
- timestamp: 2026-05-23T18:36:00Z
  source: CPU delta measurement
  finding: CEF `bun Helper.exe --type=gpu-process` consumed about 3.078 CPU seconds over a 3 second window, approximately one full CPU core.
- timestamp: 2026-05-23T18:34:46Z
  source: generated runtime config and desktop launch log
  finding: `build/dev-win-x64/BluettiMonitor-dev/Resources/build.json` did receive the project `chromiumFlags`; changing them to explicit `disable-gpu` and `disable-gpu-compositing` made Electrobun log both flags as applied.
- timestamp: 2026-05-23T18:34:55Z
  source: process command-line inspection and CPU delta measurement
  finding: With explicit `disable-gpu` and `disable-gpu-compositing`, the GPU helper changed to `--use-gl=angle --use-angle=d3d11-warp-webgl` but still consumed 4.953 CPU seconds over a 5 second window.
- timestamp: 2026-05-23T18:35:43Z
  source: desktop launch log
  finding: With explicit hardware ANGLE flags (`use-gl=angle`, `use-angle=d3d11`) and GPU defaults removed, Electrobun/Bun crashed in `libNativeWrapper.dll` shortly after startup.
- timestamp: 2026-05-23T18:36:08Z
  source: generated runtime config
  finding: Reverting Windows to `bundleCEF: false` and `defaultRenderer: "native"` generated `build.json` with `defaultRenderer: "native"` and `availableRenderers: ["native"]`; no CEF helper executable or `libcef.dll` remained in the dev bundle.

# Findings

- Root cause: Electrobun 1.16.0 bundled CEF on Windows is not stable with this app's current renderer path. The attempted `chromiumFlags` override was not stale; it reached the bundle, but CEF still spawned a busy GPU helper through either disabled GL or WARP software ANGLE, and forcing hardware ANGLE crashed the native wrapper.
- Fix applied: Reverted Windows Electrobun builds to the native WebView2 renderer by setting `win.bundleCEF: false` and `win.defaultRenderer: "native"` and removing the CEF-specific `chromiumFlags` override.
- Verification: `npm --prefix lib/bluetti-mqtt-node run build` passed. A dev build generated native-only `Resources/build.json` and had no bundled CEF helper/libcef files. Hidden background GUI launches are not valid WebView2 verification because they produce invalid native window handles; run `npm run desktop:dev` interactively for final manual smoke verification.

# Resolution

- root_cause: Windows bundled CEF in Electrobun 1.16.0 drives a continuously busy GPU helper in this app; project `chromiumFlags` are applied but do not produce a stable CEF GPU mode.
- fix: Use Windows native/WebView2 rendering instead of bundled CEF.
- verification: Library TypeScript build passed, dev bundle config is native-only, and CEF runtime files/helpers are absent from the generated dev bundle.

# Next Plan

- Run `npm run desktop:dev` interactively from a normal terminal/window to smoke-test the WebView2 desktop shell.
