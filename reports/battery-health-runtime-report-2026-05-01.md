# Bluetti Battery Health and Runtime Report

Generated: 2026-05-01  
Database analyzed: `.dev-data/bluetti-dev.db`  
Device: `AC500-2237000003358`  
Telemetry span: 2026-03-31 20:36 UTC to 2026-05-01 02:09 UTC

## Executive Summary

Your runtime looks lower than the sticker capacity would imply, but it is mostly in the expected range once the B300S depth-of-discharge and inverter-efficiency losses are included.

For an AC500 with two B300S batteries, the nominal battery bank is 6,144 Wh. BLUETTI's own B300S runtime FAQ uses 90% depth of discharge and 90% inverter efficiency for runtime estimates, which makes the practical full-range AC-delivered energy about 4,977 Wh. Because your AC500 is configured with `battery_range_start = 20`, the expected delivered energy from 100% down to that 20% floor is about 3,981 Wh.

The database's meaningful discharge sessions show a median measured load-delivered capacity of about 4,631 Wh per displayed 100% of battery, or about 3,705 Wh over a 100% -> 20% operating window. That is roughly 93% of the BLUETTI formula-based expectation for your configured 20% floor. On that evidence, I would not call the batteries obviously unhealthy.

The one thing worth checking physically: pack detail telemetry shows healthy-looking data for pack 1 and pack 2 historically, but pack 2's latest nonzero detailed reading in this database was on 2026-04-29 01:47 UTC. If the runtime complaint is recent, confirm in the BLUETTI app that both B300S packs are connected and contributing, then reseat/check the expansion cables.

## Spec Baseline

Official BLUETTI references used:

- AC500 + 2*B300S kit capacity: 6,144 Wh, 5,000 W AC output, LiFePO4 3,500+ cycles.
  Source: https://www.bluettipower.com/products/home-backup-power-ac500
- B300S capacity: 3,072 Wh, 51.2 V, 60 Ah; life cycles: 3,500+ cycles to 80% original capacity.
  Source: https://www.bluettipower.com/products/bluetti-b300s-expansion-battery
- BLUETTI runtime formula: `Battery capacity x DoD x inverter efficiency / device rated power`; their B300S FAQ says DoD and inverter efficiency are both 90%.
  Source: https://www.bluettipower.com/products/bluetti-b300s-expansion-battery

Expected energy for your setup:

| Basis | Calculation | Practical delivered energy |
| --- | ---: | ---: |
| Sticker capacity | `2 x 3,072 Wh` | `6,144 Wh` |
| BLUETTI full-range runtime basis | `6,144 x 0.90 DoD x 0.90 efficiency` | `4,977 Wh` |
| Your configured 100% -> 20% window | `4,977 x 0.80` | `3,981 Wh` |

At a roughly 200 W net load, that means:

| Starting SOC | Expected runtime to 20% floor |
| ---: | ---: |
| 100% | about 19.9 hours |
| 75% | about 13.7 hours |
| 69% | about 12.2 hours |
| 50% | about 7.5 hours |

If only one B300S were actually online, those estimates would be about half as long.

## Database Findings

The database contains 3,251,672 readings for one AC500.

Important latest readings near the end of the database:

| Field | Latest value |
| --- | ---: |
| `total_battery_percent` | `69%` |
| `ac_output_power` | about `205 W` |
| `dc_output_power` | `0 W` |
| `ac_input_power` | `0 W` |
| `dc_input_power` | about `7-8 W` |
| `battery_range_start` | `20%` |
| `battery_range_end` | `100%` |

The recent net load is therefore roughly 197-205 W. At 69% SOC with a 20% floor and two healthy/connected B300S packs, expected remaining runtime is roughly 12 hours. With one connected pack, it would be roughly 6 hours.

## Discharge Session Analysis

Method:

- I integrated `ac_output_power + dc_output_power - ac_input_power - dc_input_power` over time.
- I compared that delivered net energy against drops in `total_battery_percent`.
- I focused on meaningful discharge sessions with at least a 40 percentage-point SOC drop and at least 6 hours of data.
- This is a field estimate, not a lab-grade constant-load capacity test. Solar input, grid charge, SOC quantization, and AC500 reporting quirks can move individual sessions around.

Robust session summary:

| Metric | Result |
| --- | ---: |
| Meaningful large discharge sessions | `17` |
| Median SOC drop | `58 percentage points` |
| Median discharge duration | `15.3 hours` |
| Median net load | `172 W` |
| Median inferred full-range delivered capacity | `4,650 Wh` |
| Median inferred 100% -> 20% delivered capacity | `3,720 Wh` |

Selected large discharge sessions:

| Start UTC | End UTC | SOC | Duration | Net Wh | Inferred full-range Wh |
| --- | --- | ---: | ---: | ---: | ---: |
| 2026-04-21 23:03 | 2026-04-22 19:01 | 90% -> 8% | 20.0 h | 4,659 | 5,682 |
| 2026-04-21 00:18 | 2026-04-21 17:27 | 63% -> 1% | 17.1 h | 3,805 | 6,137 |
| 2026-04-06 22:26 | 2026-04-07 15:21 | 74% -> 2% | 16.9 h | 3,592 | 4,989 |
| 2026-04-27 23:19 | 2026-04-28 16:10 | 74% -> 5% | 16.8 h | 3,195 | 4,631 |
| 2026-04-23 00:44 | 2026-04-23 17:33 | 85% -> 23% | 16.8 h | 2,928 | 4,722 |
| 2026-04-25 00:19 | 2026-04-25 15:40 | 91% -> 33% | 15.4 h | 2,697 | 4,650 |
| 2026-04-19 00:17 | 2026-04-19 15:33 | 81% -> 23% | 15.3 h | 2,623 | 4,522 |
| 2026-04-18 00:41 | 2026-04-18 15:29 | 73% -> 19% | 14.8 h | 2,456 | 4,549 |
| 2026-04-15 01:38 | 2026-04-15 15:08 | 83% -> 29% | 13.5 h | 2,444 | 4,526 |
| 2026-04-14 02:24 | 2026-04-14 16:05 | 99% -> 48% | 13.7 h | 2,324 | 4,557 |

There are some outliers, especially shorter or telemetry-interrupted sessions, but the central tendency is pretty consistent: most large discharges cluster around 4.5-4.8 kWh inferred delivered capacity across the displayed SOC range.

## Pack Telemetry

Pack detail records are much less frequent than the main power/SOC readings, but they are useful for a quick sanity check.

Pack detail summary:

| Pack index | Nonzero percent records | Latest nonzero reading | Latest cell spread |
| ---: | ---: | --- | ---: |
| 1 | 3,170 | 68% at 2026-04-30 21:54 UTC | 0.01 V |
| 2 | 981 | 41% at 2026-04-29 01:47 UTC | 0.01 V |
| 3-6 | no nonzero pack-percent records | not applicable | not applicable |

The latest useful cell-voltage spreads for pack 1 and pack 2 look good. Most pack cell spreads were very tight: median 0.00-0.01 V, 95th percentile 0.02-0.04 V. A few historical worst-case spreads appeared at very low SOC, especially pack 2 around 2026-04-09, but the latest valid pack 2 spread was normal.

The pack-count style fields are ambiguous in this dataset. `pack_num_max = 6` appears to be the maximum supported slots, not the number of connected batteries. The detailed records show nonzero data for two packs, matching your expected two B300S setup, but recent pack 2 detail is older than pack 1 detail. That is the main thing I would verify outside the database.

## Interpretation

The observed runtime is broadly appropriate for two B300S packs if you are comparing against BLUETTI's own runtime formula rather than the raw 6,144 Wh sticker capacity.

The numbers do not scream "failed battery." Median observed delivered energy over your 100% -> 20% configured range is about 3.7 kWh, versus about 4.0 kWh using BLUETTI's DoD/efficiency runtime assumptions. That difference is noticeable, but plausible in real use with mixed loads, SOC rounding, input/output transitions, and telemetry timing.

What could make runtime feel disappointing:

- The dashboard reserve is 20%, so you are intentionally not using the bottom fifth of displayed SOC.
- BLUETTI's own runtime math already discounts capacity by DoD and inverter efficiency.
- At 200 W, the realistic 100% -> 20% runtime is closer to 20 hours, not the 30+ hours implied by `6,144 Wh / 200 W`.
- If only one B300S is online, runtime at the same load would fall to roughly 10 hours from 100% -> 20%, or about 6 hours from 69% -> 20%.

## Recommended Checks

1. In the BLUETTI app, confirm both B300S packs are currently visible, connected, and enabled.
2. Reseat/check both expansion battery cables, especially if the runtime drop started after 2026-04-29.
3. Run a clean controlled test: charge to 100%, disable grid charging, keep solar input either off or recorded, use a steady 180-250 W load, and stop at 20%. Expected delivered load energy is roughly 3.8-4.1 kWh.
4. If the controlled test delivers materially below 3.5 kWh to the load with both packs confirmed online, then the batteries or reporting deserve deeper investigation.

Bottom line: based on the history here, the system looks more like "normal practical runtime with a reserve and conversion losses" than "obviously unhealthy batteries." The only yellow flag is the age of the latest nonzero pack 2 detail telemetry, so I would verify current two-pack connectivity first.

