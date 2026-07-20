import { expect, test } from '@playwright/test';

test('phone-sized shell keeps overview and raw data usable', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/?mock=1');

  await expect(page.getByTestId('shell-title')).toHaveText('Overview');
  await expect(page.getByTestId('shell-route-signal')).toContainText('Battery');
  await expect(page.locator('.device-overview-header').first()).toBeVisible();
  await expect(page.locator('.live-power-battery').first()).toContainText('Battery reserve');
  await expect(page.locator('.overview-report-section')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'System essentials' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Power channels' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Configuration and identity' })).toBeVisible();

  const overviewLayout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
    infoRowHeights: [...document.querySelectorAll<HTMLElement>('.info-row')].map((row) => row.getBoundingClientRect().height),
  }));
  expect(overviewLayout.documentWidth).toBe(overviewLayout.viewportWidth);
  expect(Math.max(...overviewLayout.infoRowHeights)).toBeLessThan(100);
  expect(overviewLayout.documentHeight).toBeLessThan(5200);

  await page.getByLabel('Open Navigation').click();
  await page.getByTestId('sidebar-route-raw').click();

  await expect(page.getByTestId('shell-title')).toHaveText('Raw Data');
  await expect(page.getByPlaceholder('Search fields...')).toBeVisible();
  await expect(page.getByTestId('shell-route-signal')).toContainText(/visible/);

  const deviceButtons = page.locator('.device-pill-row .ui-pill-button');
  if (await deviceButtons.count() > 1) {
    await deviceButtons.nth(1).click();
  }

  await page.getByPlaceholder('Search fields...').fill('battery');
  await expect(page.locator('.raw-field-card').filter({ hasText: 'total_battery_percent' }).first()).toBeVisible();
  await expect(page.locator('.raw-field-card').first()).toBeVisible();
  await expect(page.locator('.data-table-scroll')).toBeHidden();
});

test('default Electrobun viewport keeps the live flow and shell composed', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 920 });
  await page.goto('/?mock=1');

  await expect(page.getByText('Live power flow, battery reserve, and system state from your AC500.')).toBeVisible();
  await expect(page.getByTestId('shell-status-connection')).toContainText('Live');
  await expect(page.locator('.live-power-map')).toBeVisible();

  const layout = await page.evaluate(() => {
    const topBar = document.querySelector<HTMLElement>('.top-bar')!.getBoundingClientRect();
    const title = document.querySelector<HTMLElement>('.top-bar-title')!.getBoundingClientRect();
    const map = document.querySelector<HTMLElement>('.live-power-map')!;
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      topBarHeight: Math.round(topBar.height),
      titleWidth: Math.round(title.width),
      flowColumns: getComputedStyle(map).gridTemplateColumns.split(' ').length,
    };
  });

  expect(layout.documentWidth).toBe(layout.viewportWidth);
  expect(layout.topBarHeight).toBeLessThan(90);
  expect(layout.titleWidth).toBeGreaterThan(70);
  expect(layout.flowColumns).toBe(5);

  const columnCounts = await page.locator('.overview-detail-grid').evaluateAll((grids) => grids.map((grid) => (
    getComputedStyle(grid).gridTemplateColumns.split(' ').length
  )));
  expect(columnCounts).toEqual([3, 3]);
});

test('phone analytics headers keep all controls in compact touch-safe rows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?mock=1');

  const assertCompactHero = async (heroSelector: string, expectedFocusCount: number) => {
    const result = await page.locator(heroSelector).evaluate((hero, focusCount) => {
      const rects = (selector: string) => [...hero.querySelectorAll<HTMLElement>(selector)].map((element) => {
        const rect = element.getBoundingClientRect();
        return { top: Math.round(rect.top), height: Math.round(rect.height) };
      });
      const heroRect = hero.getBoundingClientRect();
      const metadata = rects('.workspace-panel-meta > *');
      const windows = rects('[aria-label="Window"] .analytics-segment-button');
      const focuses = rects('.analytics-focus-strip .analytics-segment-button');
      return {
        heroHeight: Math.round(heroRect.height),
        metadata,
        windows,
        focuses,
        expectedFocusCount: focusCount,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    }, expectedFocusCount);

    expect(result.heroHeight).toBeLessThan(560);
    expect(result.documentWidth).toBe(result.viewportWidth);
    expect(result.metadata).toHaveLength(3);
    expect(new Set(result.metadata.map((item) => item.top)).size).toBe(1);
    expect(result.windows).toHaveLength(4);
    expect(new Set(result.windows.map((item) => item.top)).size).toBe(1);
    expect(result.focuses).toHaveLength(result.expectedFocusCount);
    expect(new Set(result.focuses.map((item) => item.top)).size).toBe(1);
    expect(Math.min(...[...result.windows, ...result.focuses].map((item) => item.height))).toBeGreaterThanOrEqual(44);
  };

  await page.getByLabel('Open Navigation').click();
  await page.getByTestId('sidebar-route-charts').click();
  await assertCompactHero('.charts-hero-card', 4);

  await page.getByLabel('Open Navigation').click();
  await page.getByTestId('sidebar-route-solar').click();
  await assertCompactHero('.solar-hero-card', 3);
});

test('phone-sized charts and solar controls keep their report flow', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/?mock=1');

  await page.getByLabel('Open Navigation').click();
  await page.getByTestId('sidebar-route-charts').click();

  await expect(page.getByTestId('shell-title')).toHaveText('Charts');
  await expect(page.getByRole('button', { name: '6H' })).toBeVisible();
  await page.getByRole('button', { name: '6H' }).click();
  await expect(page.getByTestId('shell-route-signal')).toContainText('6H');
  await page.getByRole('button', { name: 'Input sources' }).click();
  await expect(page.getByText('Where input power has been coming from')).toBeVisible();
  await expect(page.locator('.analytics-score-grid .metric-tile').first()).toBeVisible();

  await page.getByLabel('Open Navigation').click();
  await page.getByTestId('sidebar-route-solar').click();

  await expect(page.getByTestId('shell-title')).toHaveText('Solar');
  await expect(page.getByRole('button', { name: 'Input split' })).toBeVisible();
  await page.getByRole('button', { name: 'Input split' }).click();
  await expect(page.getByText('How PV1 and PV2 are sharing the harvest')).toBeVisible();
  await expect(page.locator('.solar-score-grid .metric-tile').first()).toBeVisible();
  await expect(page.getByText('Fields driving this solar page')).toBeVisible();
});
