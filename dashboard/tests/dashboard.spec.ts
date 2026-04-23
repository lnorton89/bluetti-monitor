import { expect, test } from '@playwright/test';

test('renders overview cleanly in mock mode', async ({ page }) => {
  await page.goto('/?mock=1');

  await expect(page.getByTestId('shell-title')).toHaveText('Overview');
  await expect(page.getByTestId('shell-route-signal')).toContainText('Battery');
  await expect(page.locator('.device-header').filter({ hasText: 'AC500' })).toBeVisible();
  await expect(page.getByText('Input Bus')).toBeVisible();
  await expect(page.locator('.hero-battery').filter({ hasText: 'Battery Reserve' })).toContainText('67%');

  await page.getByTestId('sidebar-route-solar').click();
  await expect(page.getByTestId('shell-title')).toHaveText('Solar');
  await expect(page.getByTestId('sidebar-route-solar')).toHaveClass(/active/);

  const mainBox = await page.locator('.app-main').boundingBox();
  expect(mainBox?.width).toBeGreaterThan(700);
});

test('supports charts and raw data navigation with responsive menu', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/?mock=1');

  await page.getByLabel('Open Navigation').click();
  await expect(page.getByTestId('sidebar-nav')).toBeVisible();

  await page.getByTestId('sidebar-route-charts').click();
  await expect(page.locator('.sidebar.open')).not.toBeVisible();
  await expect(page.getByTestId('shell-title')).toHaveText('Charts');
  await expect(page.getByTestId('shell-route-signal')).toContainText('Window');
  await expect(page.getByTestId('shell-route-signal')).toContainText('24H');

  await page.getByLabel('Open Navigation').click();
  await page.getByTestId('sidebar-route-solar').click();
  await expect(page.getByTestId('shell-title')).toHaveText('Solar');
  await expect(page.getByTestId('shell-route-signal')).toContainText('Solar');
  await expect(page.getByTestId('shell-route-signal')).toContainText(/(\d[\d,]* W|--)/);

  await page.getByLabel('Open Navigation').click();
  await page.getByTestId('sidebar-route-raw').click();
  await expect(page.getByTestId('shell-title')).toHaveText('Raw Data');
  await expect(page.getByTestId('shell-route-signal')).toContainText('Fields');
  await expect(page.getByTestId('shell-route-signal')).toContainText(/\d+ visible/);
  await expect(page.getByPlaceholder('Search fields...')).toBeVisible();
  await page.getByPlaceholder('Search fields...').fill('battery');
  await expect(page.locator('.raw-field-card').filter({ hasText: 'total_battery_percent' }).first()).toBeVisible();
  await expect(page.getByTestId('shell-route-signal')).toContainText(/visible/);
  await page.getByLabel('Open Navigation').click();
  await expect(page.getByTestId('sidebar-route-raw')).toHaveClass(/active/);
});
