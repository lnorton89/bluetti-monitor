---
status: complete
quick_id: 260628-o7r
slug: peak-input-on-overview-page-shouldnt-use
---

# Summary

Changed the overview page's "Highest today" input peak path to use solar/DC input only, excluding AC/grid input from both live peak accumulation and the history-backed `/stats/{device}/input-max` calculation.

## Changes
- Added `getCurrentSolarInputWatts` in `dashboard/src/lib/power.ts` while keeping `getCurrentInputWatts` for total input use cases.
- Updated `dashboard/src/pages/Overview.tsx` and mock `fetchInputMax` to use solar-only input.
- Updated `api/main.py` so `/stats/{device}/input-max` queries and reconstructs only solar/DC input fields.
- Added focused frontend and backend regression coverage.

## Verification
- `.venv\Scripts\python.exe -m unittest test_input_max` from `api/`
- `bun test dashboard/test-unit/daily-input-window.test.ts dashboard/test-unit/power.test.ts`
- `bun run --cwd dashboard build`

## Notes
- The worktree had pre-existing edits in related overview/input peak files before this task started, so no commit was created to avoid bundling unrelated local changes.
