param(
  [Parameter(Mandatory = $true)]
  [string] $IconPath,

  [string] $TitlePrefix = "Bluetti Monitor"
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class WindowIconNative {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern IntPtr LoadImage(IntPtr hinst, string lpszName, uint uType, int cxDesired, int cyDesired, uint fuLoad);

  [DllImport("user32.dll", CharSet = CharSet.Auto)]
  public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

  [DllImport("user32.dll", EntryPoint = "SetClassLongPtr", SetLastError = true)]
  public static extern IntPtr SetClassLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

  [DllImport("user32.dll", EntryPoint = "SetClassLong", SetLastError = true)]
  public static extern uint SetClassLong32(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

  public static IntPtr SetClassLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong) {
    if (IntPtr.Size == 8) {
      return SetClassLongPtr64(hWnd, nIndex, dwNewLong);
    }
    return new IntPtr(SetClassLong32(hWnd, nIndex, dwNewLong));
  }
}
"@

$resolvedIconPath = [System.IO.Path]::GetFullPath($IconPath)
if (-not [System.IO.File]::Exists($resolvedIconPath)) {
  Write-Error "Icon file does not exist: $resolvedIconPath"
  exit 1
}

$WM_SETICON = 0x0080
$ICON_SMALL = [IntPtr] 0
$ICON_BIG = [IntPtr] 1
$GCLP_HICON = -14
$GCLP_HICONSM = -34
$IMAGE_ICON = 1
$LR_LOADFROMFILE = 0x0010

$smallIcon = [WindowIconNative]::LoadImage([IntPtr]::Zero, $resolvedIconPath, $IMAGE_ICON, 16, 16, $LR_LOADFROMFILE)
$bigIcon = [WindowIconNative]::LoadImage([IntPtr]::Zero, $resolvedIconPath, $IMAGE_ICON, 32, 32, $LR_LOADFROMFILE)

if ($smallIcon -eq [IntPtr]::Zero -or $bigIcon -eq [IntPtr]::Zero) {
  Write-Error "Could not load icon: $resolvedIconPath"
  exit 1
}

$matched = 0
$callback = {
  param([IntPtr] $hWnd, [IntPtr] $lParam)

  if (-not [WindowIconNative]::IsWindowVisible($hWnd)) {
    return $true
  }

  $title = New-Object System.Text.StringBuilder 512
  [void] [WindowIconNative]::GetWindowText($hWnd, $title, $title.Capacity)

  if ($title.ToString().StartsWith($TitlePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    [void] [WindowIconNative]::SendMessage($hWnd, $WM_SETICON, $ICON_SMALL, $smallIcon)
    [void] [WindowIconNative]::SendMessage($hWnd, $WM_SETICON, $ICON_BIG, $bigIcon)
    [void] [WindowIconNative]::SetClassLongPtr($hWnd, $GCLP_HICONSM, $smallIcon)
    [void] [WindowIconNative]::SetClassLongPtr($hWnd, $GCLP_HICON, $bigIcon)
    $script:matched++
  }

  return $true
}

[void] [WindowIconNative]::EnumWindows($callback, [IntPtr]::Zero)
Write-Output "Updated $matched window icon(s)."

if ($matched -eq 0) {
  exit 2
}
