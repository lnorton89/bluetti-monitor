# Quick Task 20260520: Analytics History Window

## Goal

Fix analytics range views so the 24h, 3d, and 7d selections can retrieve enough rows to cover the requested time span at the AC500 sampling rate.

## Plan

1. Reproduce the 24h API response span and confirm whether the frontend or API clips the window.
2. Raise analytics per-field history limits for longer ranges.
3. Raise the API history endpoint maximum to allow those larger requests.
4. Update README history limit documentation and run focused verification.
