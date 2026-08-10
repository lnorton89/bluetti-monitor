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
      "docker-compose.yml": "docker-compose.yml",
      "mosquitto/mosquitto.conf": "mosquitto/mosquitto.conf",
      "scripts/lock.mjs": "scripts/lock.mjs",
      "scripts/desktop-stack.mjs": "scripts/desktop-stack.mjs",
      ".vendor/bridge-dist": "vendor/bridge-dist",
      ".vendor/bridge-helper": "vendor/bridge-helper",
    },
    watchIgnore: [
      ".dev-data/**",
      "api/.venv/**",
      "api/__pycache__/**",
      "dashboard/dev-dist/**",
      "dashboard/dist/**",
      "dashboard/node_modules/.vite/**",
      "lib/bluetti-mqtt-node/artifacts/**",
      "lib/bluetti-mqtt-node/dist/**",
    ],
    mac: {
      bundleCEF: false,
    },
    linux: {
      bundleCEF: false,
      icon: "assets/icon.png",
    },
    win: {
      bundleCEF: false,
      defaultRenderer: "native",
    },
  },
  scripts: {
    preBuild: "scripts/electrobun-prebuild-clean.mjs",
    postBuild: "scripts/electrobun-postbuild-icons.mjs",
  },
} satisfies ElectrobunConfig;
