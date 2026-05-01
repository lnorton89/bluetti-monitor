import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const buildDir = process.env.ELECTROBUN_BUILD_DIR;
const appName = process.env.ELECTROBUN_APP_NAME;
const iconPath = resolve("assets", "icon.ico");
const pngIconPath = resolve("assets", "icon.png");

if (isWindows && buildDir && appName && existsSync(iconPath)) {
  const rceditPath = findRcedit();
  const bundleDir = join(buildDir, appName);

  if (existsSync(bundleDir)) {
    copyResourceIcon(bundleDir, iconPath);
    copyMainviewIcons(bundleDir);
  }

  if (rceditPath && existsSync(bundleDir)) {
    stampIcon(rceditPath, join(bundleDir, "bin", "launcher.exe"), iconPath);
    stampIcon(rceditPath, join(bundleDir, "bin", "bun.exe"), iconPath);
  } else {
    console.warn("[desktop:icon] local rcedit was not found; Windows executable icons were not stamped");
  }
}

function copyResourceIcon(bundleDir, sourceIconPath) {
  const resourcesDir = join(bundleDir, "Resources");
  mkdirSync(resourcesDir, { recursive: true });
  copyFileSync(sourceIconPath, join(resourcesDir, "app.ico"));
}

function copyMainviewIcons(bundleDir) {
  const mainviewAssetsDir = join(bundleDir, "Resources", "app", "views", "mainview", "assets");
  mkdirSync(mainviewAssetsDir, { recursive: true });
  copyFileSync(iconPath, join(mainviewAssetsDir, "icon.ico"));

  if (existsSync(pngIconPath)) {
    copyFileSync(pngIconPath, join(mainviewAssetsDir, "icon.png"));
  }
}

function findRcedit() {
  const candidates = [
    resolve("node_modules", "rcedit", "bin", "rcedit-x64.exe"),
    resolve("node_modules", "electrobun", "node_modules", "rcedit", "bin", "rcedit-x64.exe"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  const bunModulesDir = resolve("node_modules", ".bun");
  if (!existsSync(bunModulesDir)) {
    return null;
  }

  for (const entry of readdirSync(bunModulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("rcedit@")) {
      continue;
    }

    const candidate = join(bunModulesDir, entry.name, "node_modules", "rcedit", "bin", "rcedit-x64.exe");
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function stampIcon(rceditPath, exePath, sourceIconPath) {
  if (!existsSync(exePath)) {
    return;
  }

  const result = spawnSync(rceditPath, [exePath, "--set-icon", sourceIconPath], {
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.status === 0) {
    console.log(`[desktop:icon] stamped ${exePath}`);
  } else {
    console.warn(`[desktop:icon] could not stamp ${exePath}`);
  }
}
