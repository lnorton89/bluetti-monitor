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
      "assets/icon.ico": "assets/icon.ico",
      "assets/icon.png": "assets/icon.png",
    },
    mac: {
      bundleCEF: false,
    },
    linux: {
      bundleCEF: false,
      icon: "assets/icon.png",
    },
    win: {
      bundleCEF: false,
    },
  },
  scripts: {
    preBuild: "scripts/electrobun-prebuild-clean.mjs",
    postBuild: "scripts/electrobun-postbuild-icons.mjs",
  },
} satisfies ElectrobunConfig;
