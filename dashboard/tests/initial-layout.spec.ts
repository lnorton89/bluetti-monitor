import { expect, test } from '@playwright/test';

test('captures initial layout before and after resize', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 960 });
  await page.goto('/?mock=1');
  await page.screenshot({ path: 'test-results/initial-layout-before.png', fullPage: true });

  await page.setViewportSize({ width: 1498, height: 958 });
  await page.setViewportSize({ width: 1500, height: 960 });
  await page.screenshot({ path: 'test-results/initial-layout-after.png', fullPage: true });

  await expect(page.getByTestId('shell-title')).toBeVisible();
  await expect(page.locator('.route-hero')).toHaveCount(0);
  await expect(page.locator('.top-bar')).toBeVisible();
  await expect(page.locator('.device-header')).toBeVisible();
});
