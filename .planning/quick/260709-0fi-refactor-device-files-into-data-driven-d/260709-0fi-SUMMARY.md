---
status: complete
---

# Summary: Device Definition Refactor

## What Was Done

- **Consolidated** 8 per-device class files into 2 files: `device-builders.ts` (shared field groups + struct builders) and `definition.ts` (DeviceDefinition interface, BLUETTI_DEFINITIONS table, BluettiDeviceModel class)

- **Extracted** shared field groups `CORE` (12 fields universal across AC200M/AC300/AC500/EB3A/EP500/EP500P) and `CONTROL` (12 writable fields shared by AC300/AC500/EP500/EP500P), eliminating ~60 lines of verbatim duplication

- **Added** `addMany()` method to `DeviceStruct` for composing structs from pre-built field arrays

- **Split** `struct.ts` → `field.ts` (all field type classes + helpers) + `struct.ts` (DeviceStruct builder only)

- **Extracted** enum definitions into dedicated `enums.ts` with generic names (`OutputMode`, `LedMode`, etc.)

- **Replaced** `registry.ts` switch statement with `BLUETTI_DEFINITION_MAP` lookup

- **Updated** `index.ts` exports to match new file structure

- **Added** comprehensive `devices.test.mjs` covering field types, definitions, struct parsing across all 8 devices, registry, and BluettiDeviceModel

## Files Changed

| File | Change |
|------|--------|
| `src/devices/ac200m.ts` | Deleted |
| `src/devices/ac300.ts` | Deleted |
| `src/devices/ac500.ts` | Deleted |
| `src/devices/ac60.ts` | Deleted |
| `src/devices/eb3a.ts` | Deleted |
| `src/devices/ep500.ts` | Deleted |
| `src/devices/ep500p.ts` | Deleted |
| `src/devices/ep600.ts` | Deleted |
| `src/devices/definition.ts` | Created |
| `src/devices/device-builders.ts` | Created |
| `src/devices/enums.ts` | Created |
| `src/devices/field.ts` | Created |
| `src/devices/struct.ts` | Rewritten (20% size) |
| `src/devices/device.ts` | Updated imports |
| `src/devices/registry.ts` | Refactored (data-driven) |
| `src/index.ts` | Updated exports |
| `test/devices.test.mjs` | Created |
| `test/run-all.mjs` | Added new test |

## Verification

- TypeScript compiles cleanly (`tsc --noEmit`)
- All 11 tests pass (9 existing + 2 new)
- No change to external API surface
- All consumers use `BluettiDevice` abstract type — no concrete class imports exist outside `registry.ts`
