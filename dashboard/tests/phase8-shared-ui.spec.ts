import { expect, test } from '@playwright/test';

test('phase 08 shared surfaces stay consistent across overview and raw data', async ({ page }) => {
  await page.goto('/?mock=1');

  await expect(page.locator('.surface-card').first()).toBeVisible();
  await expect(page.locator('.metric-tile').first()).toBeVisible();
  await expect(page.locator('.chip').first()).toBeVisible();
  await expect(page.getByText('Input Bus')).toBeVisible();

  await page.getByTestId('sidebar-route-raw').click();
  await expect(page.getByTestId('shell-title')).toHaveText('Raw Data');
  await expect(page.getByText('Inspect the live payload shape')).toBeVisible();
  await expect(page.locator('.surface-card').first()).toBeVisible();
  await expect(page.locator('.chip').filter({ hasText: /device|visible field/i }).first()).toBeVisible();
  await page.getByPlaceholder('Search fields...').fill('battery');
  await expect(page.getByText('total_battery_percent')).toBeVisible();
});

test('phase 08 shared controls still drive charts and solar workspaces', async ({ page }) => {
  await page.goto('/?mock=1');

  await page.getByTestId('sidebar-route-charts').click();
  await expect(page.getByTestId('shell-title')).toHaveText('Charts');
  await expect(page.locator('.surface-card').first()).toBeVisible();
  await expect(page.locator('.metric-tile').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '6H' })).toBeVisible();
  await page.getByRole('button', { name: '6H' }).click();
  await expect(page.getByTestId('shell-route-signal')).toContainText('6H');
  await page.getByRole('button', { name: 'Input sources' }).click();
  await expect(page.getByText('Where input power has been coming from')).toBeVisible();

  await page.getByTestId('sidebar-route-solar').click();
  await expect(page.getByTestId('shell-title')).toHaveText('Solar');
  await expect(page.locator('.surface-card').first()).toBeVisible();
  await expect(page.locator('.metric-tile').first()).toBeVisible();
  await page.getByRole('button', { name: 'Input split' }).click();
  await expect(page.getByText('How PV1 and PV2 are sharing the harvest')).toBeVisible();
  await expect(page.getByText('Fields driving this solar page')).toBeVisible();
});
