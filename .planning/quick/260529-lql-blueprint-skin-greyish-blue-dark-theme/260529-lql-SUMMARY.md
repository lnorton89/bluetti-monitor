# Quick Task 260529-lql: Blueprint dark theme — greyish-blue tone

## Summary
Desaturated the blueprint dark theme's blue palette to a greyish-blue / steel-blue tone. All non-blue colors (red, orange, yellow, green, violet) were left untouched.

## Changes
- `analytics/src/styles/skins/blueprint.css`: 29 color values changed in the dark theme block (lines 8-53)

## Palette shift
- Backgrounds: `#081325` → `#0f131a`, `#0b1a31` → `#141a24`
- Text: `#eef8ff` → `#e2e8f0`, `#9eb9d8` → `#94a3b8`
- Accent: `#65e9ff` (cyan) → `#7a8ba8` (steel)
- Accent-2: `#83a7ff` (blue) → `#6a7da0` (greyish-blue)
- Borders: `rgba(137, 202, 255, ...)` → `rgba(148, 163, 184, ...)`
- All interaction colors (hover, focus, highlight) shifted from cyan to steel
