---
quick_id: 260719-s35
date: 2026-07-20
topic: Overview live snapshot redesign
---

# Research: Overview live snapshot redesign

## Problem observed at the default Electrobun size

- The 1500 x 960 desktop window leaves roughly 1300 px after the fixed sidebar, but the snapshot spends most of its left half on empty space and squeezes input, battery, and output into three narrow cards.
- The top bar repeats battery and freshness information, always shows a one-device count, and exposes two separate notification controls. This causes wrapping and title truncation even at the product's default window size.
- The device header repeats live/freshness state already present in the shell.
- Historical peak and generation values compete with the immediate question the snapshot should answer: where power is coming from, where it is going, and what the battery is doing.

## Evidence and principles

- Grafana recommends that dashboards answer a clear question, progress from general to specific, reduce cognitive load, and keep visualizations focused: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/
- Carbon's dashboard guidance recommends a strong hierarchy, placing the most important content in the largest/highest-contrast area, limiting metrics, using consistent colors, and preserving whitespace: https://carbondesignsystem.com/data-visualization/dashboards/
- Carbon recommends direct labels over legends because legends add an association task: https://carbondesignsystem.com/data-visualization/legends/
- GOV.UK's layout guidance recommends responsive columns that adapt to available space rather than assuming a fixed device: https://design-system.service.gov.uk/styles/layout/
- Carbon's color guidance requires contrast to remain meaningful and consistent, not merely decorative: https://carbondesignsystem.com/elements/color/overview/
- Energy-dashboard research emphasizes the usability/complexity tradeoff and the value of immediately understandable real-time feedback: https://pureportal.coventry.ac.uk/en/publications/home-energy-dashboard-user-interface-design-considerations/

## Design decisions

1. Make the snapshot a single live-power command surface answering one question: how is the current load being supplied?
2. Use a hub topology—sources feed the AC500, the AC500 feeds loads, and battery flow branches into or out of the hub. Do not imply that source power always travels through the battery.
3. Directly label every node and connector. Use stable source, battery, and load colors with text/icons so meaning never depends on color alone.
4. Integrate SOC into the battery node and remove the separate oversized reserve panel.
5. Keep only current values in the live surface: input total/split, battery balance/SOC, and output total/split. Historical peaks and cumulative generation remain in the report sections designed for them.
6. Remove duplicate shell/device status. Hide the device-count chip when only one device exists, avoid repeating the battery chip on Overview, and collapse the two notification chips into one explicit alert status.
7. At the 1500 x 960 Electrobun default, the snapshot must fit without narrow cards, wrapped top-bar rows, or truncated route titles. Below tablet width it becomes a direct-label vertical flow with no horizontal overflow.
8. Removing the hero's history queries is also a time-to-useful-data improvement: the live view must not wait on daily peak requests.

## Verification target

- Real AC500 data through the persistent supervisor, not mock data, for final screenshots.
- Playwright checks at 1500 x 920 content viewport and 430 x 932 mobile viewport.
- No horizontal overflow, no shell top-bar wrapping at the desktop target, and no stale historical requests from the hero.

