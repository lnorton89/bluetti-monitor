# Quick Task 260614-nfa: Fix daily max input wattage to cover full calendar day

## Goal

Make `Highest today` mean the maximum input wattage for the full local calendar day, not the maximum within a capped recent history window.

## Plan

1. Add a backend stat endpoint that scans all input readings since the provided day-start timestamp.
2. Compute the running total input from `dc_input_power + ac_input_power` and return the maximum observed total.
3. Update the Overview card to use that stat endpoint instead of a capped frontend history bundle.
4. Raise Solar's per-input daily history request to the API cap so its per-string `Highest today` row is not limited to the last few thousand rows.
5. Run API syntax checks, dashboard unit tests, dashboard build, and a direct endpoint behavior check.

