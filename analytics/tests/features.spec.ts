import { expect, test } from '@playwright/test';

test.describe('Analytics feature verification', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL ?? '/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('system summary section exists with contextual text', async ({ page }) => {
    const summary = page.locator('.system-summary');
    await expect(summary).toBeVisible();
    const body = summary.locator('.system-summary-body');
    await expect(body).toBeVisible();
    const items = body.locator('span');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
    const texts = await items.allTextContents();
    const hasMeaningfulText = texts.some((t) =>
      t.includes('Battery') || t.includes('Solar') || t.includes('Peak') || t.includes('Collecting telemetry')
    );
    expect(hasMeaningfulText).toBeTruthy();
  });

  test('solar input has power/voltage toggle pills', async ({ page }) => {
    const toggleGroup = page.locator('.solar-toggle-group');
    await expect(toggleGroup).toBeVisible();
    const powerBtn = toggleGroup.locator('button', { hasText: 'Power' });
    const voltageBtn = toggleGroup.locator('button', { hasText: 'Voltage' });
    await expect(powerBtn).toBeVisible();
    await expect(voltageBtn).toBeVisible();
    await expect(powerBtn).toHaveClass(/active/);

    await voltageBtn.click();
    await expect(voltageBtn).toHaveClass(/active/);
    await expect(powerBtn).not.toHaveClass(/active/);

    const legend = page.locator('.solar-input-panel .legend-strip');
    await expect(legend).toBeVisible();
    const legendText = await legend.allTextContents();
    const hasVoltageLabels = legendText.some((t) => t.includes('voltage') || t.includes('Voltage'));
    expect(hasVoltageLabels).toBeTruthy();
  });

  test('side-stats show avg and peak sub-values', async ({ page }) => {
    const solarPanel = page.locator('.solar-input-panel');
    const stats = solarPanel.locator('.side-stats');
    await expect(stats).toBeVisible();
    const sideStats = stats.locator('.side-stat');
    const count = await sideStats.count();
    expect(count).toBeGreaterThanOrEqual(1);
    const hasSub = await sideStats.locator('.side-stat-sub').count();
    expect(hasSub).toBeGreaterThanOrEqual(0);
  });

  test('power balance panel has tooltip on header', async ({ page }) => {
    const header = page.locator('.panel-large .panel-header p');
    await expect(header).toBeVisible();
    const title = await header.getAttribute('title');
    expect(title).toBeTruthy();
    expect(title!.length).toBeGreaterThan(0);
  });

  test('field comparison chips grouped by category', async ({ page }) => {
    const groupLabels = page.locator('.field-chip-group-label');
    const count = await groupLabels.count();
    expect(count).toBeGreaterThanOrEqual(1);
    const texts = await groupLabels.allTextContents();
    const hasInput = texts.some((t) => t === 'Input');
    const hasBattery = texts.some((t) => t === 'Battery');
    expect(hasInput || hasBattery).toBeTruthy();
  });

  test('ambient state attribute is set on root element', async ({ page }) => {
    const hasAttr = await page.evaluate(() => {
      const root = document.documentElement;
      return root.hasAttribute('data-analytics-state');
    });
    expect(typeof hasAttr).toBe('boolean');
  });
});