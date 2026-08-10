' Launches start-on-boot.mjs with node while keeping the console window
' fully hidden. Task Scheduler runs node.exe with a visible console by
' default; WScript.Shell.Run with windowStyle 0 suppresses that.
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
targetScript = scriptDir & "\start-on-boot.mjs"

Set objShell = CreateObject("WScript.Shell")
objShell.Run "node """ & targetScript & """", 0, False
