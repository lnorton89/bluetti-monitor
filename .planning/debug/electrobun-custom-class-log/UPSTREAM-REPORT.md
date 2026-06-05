# Electrobun Windows Custom Class Fallback Report

## Summary

Electrobun's Windows native wrapper logs `Custom class failed, falling back to STATIC class` on app startup when creating the main `BrowserWindow`.

This is emitted by Electrobun native runtime output, not app code. It appears in both stdout from `electrobun dev` and the generated `build/.../bin/app.log`.

## Exact Log

```text
[Tue Jun  2 20:26:15 2026] Custom class failed, falling back to STATIC class
```

Nearby startup output:

```text
[LAUNCHER] Loaded identifier: dev.lawrence.bluetti-monitor, name: BluettiMonitor-dev, channel: dev
[LAUNCHER] Loading app code from flat files
Server started at http://localhost:50000
[Tue Jun  2 20:26:15 2026] setJSUtils called but using map-based approach instead of callbacks
[Tue Jun  2 20:26:15 2026] Custom class failed, falling back to STATIC class
WebView2: Download handler registered successfully
[WebView2] NavigationStarting fired for webview 1
```

## Environment

- OS: Windows
- Runtime command: `node scripts/dev-desktop.mjs --watch-electrobun`, which launches `electrobun dev`
- Renderer config: Windows `defaultRenderer: "native"`
- App uses Electrobun `BrowserWindow` with ordinary titled/resizable defaults.

## Versions Tested

The issue reproduces across multiple Electrobun versions:

| Electrobun version | Result |
| --- | --- |
| 1.18.1 | reproduces |
| 1.16.0 | reproduces |
| 1.14.4 | reproduces |
| 1.13.1 | reproduces |
| 1.12.3 | reproduces |

This predates the local upgrade from `1.16.0` to `1.18.1`.

## Local Source Boundary

String extraction from `libNativeWrapper.dll` shows the message lives in the native Windows wrapper near the window creation path:

```text
Custom class failed, falling back to STATIC class
ERROR: Failed to create container window even with STATIC class, error: %lu
createWindowWithFrameAndStyleFromWorker
RegisterClassA
RegisterClassExW
CreateWindowExA
CreateWindowExW
```

The Bun FFI layer calls:

```ts
native_.symbols.createWindowWithFrameAndStyleFromWorker(
  id,
  x,
  y,
  width,
  height,
  styleMask,
  toCString(titleBarStyle),
  transparent,
  trafficLightOffset.x,
  trafficLightOffset.y,
  windowCloseCallback,
  windowMoveCallback,
  windowResizeCallback,
  windowFocusCallback,
  windowBlurCallback,
  windowKeyCallback,
);
```

So the failure happens before the title is applied and does not appear to be caused by the app identifier/name.

## Minimal Config From Repro App

```ts
import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Bluetti Monitor",
    identifier: "dev.lawrence.bluetti-monitor",
    version: "0.1.0",
  },
  build: {
    views: {
      mainview: {
        entrypoint: "src/mainview/index.ts",
      },
    },
    copy: {
      "src/mainview/index.html": "views/mainview/index.html",
      "src/mainview/index.css": "views/mainview/index.css",
      "assets/icons/icon.ico": "assets/icon.ico",
      "assets/icons/icon.png": "assets/icon.png",
    },
    win: {
      bundleCEF: false,
      defaultRenderer: "native",
    },
  },
} satisfies ElectrobunConfig;
```

## Minimal BrowserWindow Options

```ts
const mainWindow = new BrowserWindow({
  title: "Bluetti Monitor",
  url: "views://mainview/index.html",
  frame: {
    width: 1500,
    height: 960,
    x: 120,
    y: 80,
  },
});
```

## Expected

The Windows wrapper registers/uses its custom window class successfully, or logs the underlying `RegisterClass`/`RegisterClassEx` error code and class name so callers can distinguish a harmless fallback from a real native window capability failure.

## Actual

The wrapper logs only:

```text
Custom class failed, falling back to STATIC class
```

The app continues to launch, but the native custom class failure is opaque and may affect behavior tied to the intended custom window class.

## Suggested Upstream Debug Additions

Please include the following in this log path:

- Win32 error from failed `RegisterClassA` / `RegisterClassExW` or `CreateWindowEx*`
- attempted class name
- whether the class was already registered
- whether the fallback changes message routing, icon/taskbar behavior, subclassing, webview parenting, or resize/move callbacks
