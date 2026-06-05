# Minimal Repro Skeleton

This is the minimal app shape to reproduce the Windows native custom class fallback.

## package.json

```json
{
  "name": "electrobun-custom-class-repro",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "electrobun dev"
  },
  "dependencies": {
    "electrobun": "1.18.1"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

## electrobun.config.ts

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

## src/bun/index.ts

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

## src/mainview/index.ts

```ts
console.log("mainview booted");
```

## src/mainview/index.html

```html
<!doctype html>
<html lang="en">
  <body>Window Class Repro</body>
</html>
```

## Run

```powershell
npm install
npm run dev
```

Look for:

```text
Custom class failed, falling back to STATIC class
```
