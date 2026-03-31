import { expect, test } from '@playwright/test';

test('renders overview cleanly in mock mode', async ({ page }) => {
  await page.goto('/?mock=1');

  await expect(page.getByText('AC500 Power Station Monitor')).toBeVisible();
  await expect(page.locator('.device-header').filter({ hasText: 'AC5002237000003358' })).toBeVisible();
  await expect(page.getByText('Input Bus')).toBeVisible();
  await expect(page.locator('.hero-battery').filter({ hasText: 'Battery Reserve' })).toContainText('67%');

  const mainBox = await page.locator('.app-main').boundingBox();
  expect(mainBox?.width).toBeGreaterThan(700);
});

test('supports charts and raw data navigation with responsive menu', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/?mock=1');

  await page.getByLabel('Open navigation').click();
  await expect(page.locator('.sidebar.open')).toBeVisible();

  await page.getByRole('link', { name: 'Charts' }).click();
  await expect(page.getByText('Add Chart')).toBeVisible();

  await page.locator('select').nth(1).selectOption({ index: 1 });
  await expect(page.getByText('readings')).toBeVisible();

  await page.getByLabel('Open navigation').click();
  await page.getByRole('link', { name: 'Raw Data' }).click();
  await expect(page.getByPlaceholder('Search fields...')).toBeVisible();
  await page.getByPlaceholder('Search fields...').fill('battery');
  await expect(page.getByText('total_battery_percent')).toBeVisible();
});
