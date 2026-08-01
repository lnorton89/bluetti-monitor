import { expect, test } from '@playwright/test';

test('DUP-DEBUG: count overview sections and dump DOM', async ({ page }) => {
  await page.goto('/?mock=1', { waitUntil: 'networkidle' });

  const counts = await page.evaluate(() => ({
    overviewPage: document.querySelectorAll('.overview-page').length,
    deviceSection: document.querySelectorAll('.device-section').length,
    deviceOverviewHeader: document.querySelectorAll('.device-overview-header').length,
    deviceHeader: document.querySelectorAll('.device-header').length,
    overviewReportSection: document.querySelectorAll('.overview-report-section').length,
    heroCard: document.querySelectorAll('.hero-card').length,
    livePowerCard: document.querySelectorAll('.live-power-card').length,
    livePowerHub: document.querySelectorAll('.live-power-hub').length,
    detailGrid: document.querySelectorAll('.detail-grid').length,
    tileGrid: document.querySelectorAll('.tile-grid').length,
    sectionPanel: document.querySelectorAll('.section-panel').length,
    switchboardGrid: document.querySelectorAll('.switchboard-grid').length,
    metricTile: document.querySelectorAll('.metric-tile').length,
    rootChildren: document.getElementById('root')?.children.length ?? -1,
    rootImmediateChildren: Array.from(document.getElementById('root')?.children ?? []).map((c) => c.tagName + '.' + (c.className || '')),
    wsStateKeys: (() => { try { return Object.keys((window as any).__WS_STATE__ ?? {}); } catch { return []; }})(),
  }));

  console.log('DUP-DEBUG COUNTS:', JSON.stringify(counts, null, 2));

  await page.screenshot({ path: 'test-results/debug-overview-full.png', fullPage: true });
  await page.screenshot({ path: 'test-results/debug-overview-top.png', fullPage: false });

  const html = await page.content();
  const require_fs = await import('node:fs');
  require_fs.writeFileSync('test-results/debug-overview.html', html);

  expect(true).toBe(true);
});
