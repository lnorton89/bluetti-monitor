# GitHub Issue Draft

Repository: `blackboardsh/electrobun`
URL: https://github.com/blackboardsh/electrobun/issues/new

## Title

Windows native wrapper logs "Custom class failed, falling back to STATIC class" when creating BrowserWindow

## Body

### Summary

Electrobun's Windows native wrapper logs `Custom class failed, falling back to STATIC class` on app startup when creating the main `BrowserWindow`.

This is emitted by Electrobun native runtime output, not app code. It appears in both stdout from `electrobun dev` and the generated `build/.../bin/app.log`.

### Exact Log

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

### Environment

- OS: Windows
- Runtime command: `node scripts/dev-desktop.mjs --watch-electrobun`, which launches `electrobun dev`
- Renderer config: Windows `defaultRenderer: "native"`
- App uses Electrobun `BrowserWindow` with ordinary titled/resizable defaults.

### Versions Tested

The issue reproduces across multiple Electrobun versions:

| Electrobun version | Result |
| --- | --- |
| 1.18.1 | reproduces |
| 1.16.0 | reproduces |
| 1.14.4 | reproduces |
| 1.13.1 | reproduces |
| 1.12.3 | reproduces |

This predates a local upgrade from `1.16.0` to `1.18.1`.

### Native Boundary Evidence

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

### Minimal Config From Repro App

```ts
import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Window Class Repro",
    identifier: "dev.example.window-class-repro",
    version: "0.0.1",
  },
  build: {
    views: {
      mainview: {
        entrypoint: "src/mainview/index.ts",
      },
    },
    copy: {
      "src/mainview/index.html": "views/mainview/index.html",
    },
    win: {
      bundleCEF: false,
      defaultRenderer: "native",
    },
  },
} satisfies ElectrobunConfig;
```

### Minimal BrowserWindow Options

```ts
import { BrowserWindow } from "electrobun/bun";

new BrowserWindow({
  title: "Window Class Repro",
  url: "views://mainview/index.html",
  frame: {
    width: 900,
    height: 600,
    x: 120,
    y: 80,
  },
});
```

### Expected

The Windows wrapper registers/uses its custom window class successfully, or logs the underlying `RegisterClass` / `RegisterClassEx` error code and class name so callers can distinguish a harmless fallback from a real native window capability failure.

### Actual

The wrapper logs only:

```text
Custom class failed, falling back to STATIC class
```

The app continues to launch, but the native custom class failure is opaque and may affect behavior tied to the intended custom window class.

### Suggested Debug Additions

It would help if this log path included:

- Win32 error from failed `RegisterClassA` / `RegisterClassExW` or `CreateWindowEx*`
- attempted class name
- whether the class was already registered
- whether the fallback changes message routing, icon/taskbar behavior, subclassing, webview parenting, or resize/move callbacks
