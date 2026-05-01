import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const isDevBuild = process.env.ELECTROBUN_BUILD_ENV === "dev";
const buildDir = process.env.ELECTROBUN_BUILD_DIR;

if (isWindows && isDevBuild && buildDir) {
  terminateProcessesInBuildDir(buildDir);
}

function terminateProcessesInBuildDir(targetDir) {
  const pids = findProcessIdsInBuildDir(targetDir);

  for (const pid of pids) {
    spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  }

  if (pids.length > 0) {
    waitForBuildDirProcessesToExit(targetDir);
  }
}

function findProcessIdsInBuildDir(targetDir) {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      [
        "$target = [System.IO.Path]::GetFullPath($env:ELECTROBUN_BUILD_DIR).TrimEnd('\\')",
        "$targetWithSlash = $target + '\\'",
        "$current = $PID",
        "Get-CimInstance Win32_Process |",
        "Where-Object {",
        "  $_.ProcessId -ne $current -and (",
        "    ($_.ExecutablePath -and [System.IO.Path]::GetFullPath($_.ExecutablePath).StartsWith($targetWithSlash, [System.StringComparison]::OrdinalIgnoreCase)) -or",
        "    ($_.CommandLine -and $_.CommandLine.IndexOf($target, [System.StringComparison]::OrdinalIgnoreCase) -ge 0)",
        "  )",
        "} | Select-Object -ExpandProperty ProcessId",
      ].join("\n"),
    ],
    {
      env: {
        ...process.env,
        ELECTROBUN_BUILD_DIR: targetDir,
      },
      encoding: "utf8",
      windowsHide: true,
    },
  );

  if (result.status !== 0 || !result.stdout.trim()) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => Number.parseInt(line.trim(), 10))
    .filter(Number.isInteger);
}

function waitForBuildDirProcessesToExit(targetDir) {
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    if (findProcessIdsInBuildDir(targetDir).length === 0) {
      return;
    }

    spawnSync("powershell.exe", ["-NoProfile", "-Command", "Start-Sleep -Milliseconds 150"], {
      stdio: "ignore",
      windowsHide: true,
    });
  }
}
