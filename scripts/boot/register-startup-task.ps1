<#
.SYNOPSIS
  Registers a Windows Task Scheduler task that starts the Bluetti Monitor
  stack (Docker services, host BLE bridge, desktop app) at user logon.

.DESCRIPTION
  Runs `node scripts/boot/start-on-boot.mjs` from this repo whenever the
  current user signs in. Requires Docker Desktop's own "Start Docker Desktop
  when you sign in" setting to be enabled, since the boot script waits for
  Docker but does not launch Docker Desktop itself.

  Re-run this script any time to update an existing registration (it
  replaces the task in place).
#>

$ErrorActionPreference = "Stop"

$taskName = "Bluetti Monitor Startup"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$scriptPath = Join-Path $repoRoot "scripts\boot\start-on-boot.mjs"
$nodePath = (Get-Command node -ErrorAction Stop).Source

if (-not (Test-Path $scriptPath)) {
    throw "Could not find $scriptPath"
}

$action = New-ScheduledTaskAction -Execute $nodePath -Argument "`"$scriptPath`"" -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

Write-Host "Registered scheduled task '$taskName' to run at logon for $env:USERNAME."
Write-Host "Action: `"$nodePath`" `"$scriptPath`" (cwd: $repoRoot)"
Write-Host ""
Write-Host "Verify Docker Desktop's own 'Start Docker Desktop when you sign in' setting is enabled,"
Write-Host "otherwise the boot script will retry for a couple of minutes and then fail."
