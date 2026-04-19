import { expect, test } from '@playwright/test';

test('phone-sized shell keeps overview and raw data usable', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/?mock=1');

  await expect(page.getByTestId('shell-title')).toHaveText('Overview');
  await expect(page.getByTestId('shell-route-signal')).toContainText('Battery');
  await expect(page.locator('.device-overview-header').first()).toBeVisible();
  await expect(page.locator('.hero-battery').first()).toContainText('Battery Reserve');

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
