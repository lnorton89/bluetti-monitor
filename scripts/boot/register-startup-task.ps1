<#
.SYNOPSIS
  Registers a Windows Task Scheduler task that starts the Bluetti Monitor
  stack (Docker services, host BLE bridge, desktop app) at user logon.

.DESCRIPTION
  Runs scripts/boot/start-on-boot.mjs from this repo whenever the current
  user signs in, via a hidden wscript.exe wrapper so no console window is
  visible - only the desktop app window appears. Requires Docker Desktop's
  own "Start Docker Desktop when you sign in" setting to be enabled, since
  the boot script waits for Docker but does not launch Docker Desktop
  itself.

  Re-run this script any time to update an existing registration (it
  replaces the task in place).
#>

$ErrorActionPreference = "Stop"

$taskName = "Bluetti Monitor Startup"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$scriptPath = Join-Path $repoRoot "scripts\boot\start-on-boot.mjs"
$vbsPath = Join-Path $repoRoot "scripts\boot\start-on-boot.vbs"
$wscriptPath = Join-Path $env:WINDIR "System32\wscript.exe"

if (-not (Test-Path $scriptPath)) {
    throw "Could not find $scriptPath"
}
if (-not (Test-Path $vbsPath)) {
    throw "Could not find $vbsPath"
}

$action = New-ScheduledTaskAction -Execute $wscriptPath -Argument "`"$vbsPath`"" -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -Hidden `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

Write-Host "Registered scheduled task '$taskName' to run at logon for $env:USERNAME."
Write-Host "Action: `"$wscriptPath`" `"$vbsPath`" (cwd: $repoRoot) - runs hidden, no console window."
Write-Host ""
Write-Host "Verify Docker Desktop's own 'Start Docker Desktop when you sign in' setting is enabled,"
Write-Host "otherwise the boot script will retry for a couple of minutes and then fail."
