<#
.SYNOPSIS
  Removes the "Bluetti Monitor Startup" scheduled task created by
  register-startup-task.ps1.
#>

$ErrorActionPreference = "Stop"

$taskName = "Bluetti Monitor Startup"

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Removed scheduled task '$taskName'."
} else {
    Write-Host "No scheduled task named '$taskName' was found."
}
