# Quick Task 260614-ftq: Remove runtime and time-to-full estimates; add daily highest wattage to input card

## Goal

Remove runtime and time-to-full estimate surfaces from the dashboard UI, then add a highest-wattage-seen-today line to the Solar input cards above the existing peak/generated footer line.

## Plan

1. Remove the Overview battery estimate component and any orphaned estimate-specific component/styles.
2. Remove Solar page time-to-full estimate cards, chart lines, side stats, field mappings, and helper logic.
3. Fetch input history since local midnight and display daily peak wattage in each Solar input card.
4. Update stale settings copy that referenced runtime/charge-time estimates.
5. Run the dashboard build and search for stale active UI references.

