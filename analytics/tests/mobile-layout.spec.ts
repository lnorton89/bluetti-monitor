import { expect, test } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe('Analytics mobile layout', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto(baseURL ?? '/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('stacks the dashboard without page-level horizontal overflow', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const selectors = [
        '.analytics-root',
        '.shell',
        '.controls-drawer',
        '.controls-drawer-toggle',
        '.panel-large',
        '.solar-input-panel',
        '.battery-posture-panel',
        '.field-comparison-panel',
      ];

      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        elements: selectors.map((selector) => {
          const el = document.querySelector<HTMLElement>(selector);
          if (!el) return { selector, width: 0, left: 0, right: 0 };
          const rect = el.getBoundingClientRect();
          return { selector, width: rect.width, left: rect.left, right: rect.right };
        }),
      };
    });

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    for (const item of metrics.elements) {
      expect(item.width, `${item.selector} should render at phone width`).toBeGreaterThan(300);
      expect(item.left, `${item.selector} should not overflow left`).toBeGreaterThanOrEqual(-1);
      expect(item.right, `${item.selector} should not overflow right`).toBeLessThanOrEqual(metrics.clientWidth + 1);
    }
  });

  test('keeps mobile controls tucked away with time windows on one line', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Controls/i })).toBeVisible();
    await expect(page.locator('.controls-band')).not.toBeVisible();

    await page.getByRole('button', { name: /Controls/i }).click();
    await expect(page.locator('.controls-band')).toBeVisible();

    const controlMetrics = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('.controls-band button'));
      const controlsBand = document.querySelector<HTMLElement>('.controls-band')!.getBoundingClientRect();
      const segmented = document.querySelector<HTMLElement>('.segmented')!;
      const segmentedRect = segmented.getBoundingClientRect();
      const timeButtons = Array.from(segmented.querySelectorAll<HTMLElement>('button')).map((button) => {
        const rect = button.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height };
      });
      return {
        controlsBand: {
          left: controlsBand.left,
          right: controlsBand.right,
          width: controlsBand.width,
        },
        segmented: {
          height: segmentedRect.height,
          top: segmentedRect.top,
          bottom: segmentedRect.bottom,
          scrollWidth: segmented.scrollWidth,
          clientWidth: segmented.clientWidth,
          timeButtons,
        },
        buttons: buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            label: button.textContent?.trim() || button.getAttribute('aria-label') || '',
            height: rect.height,
            width: rect.width,
            left: rect.left,
            right: rect.right,
          };
        }),
      };
    });

    expect(controlMetrics.controlsBand.width).toBeGreaterThan(300);
    expect(controlMetrics.segmented.height).toBeLessThanOrEqual(48);
    for (const button of controlMetrics.segmented.timeButtons) {
      expect(Math.abs(button.top - controlMetrics.segmented.top)).toBeLessThanOrEqual(5);
      expect(Math.abs(button.bottom - controlMetrics.segmented.bottom)).toBeLessThanOrEqual(5);
    }
    for (const button of controlMetrics.buttons) {
      expect(button.height, `${button.label} height`).toBeGreaterThanOrEqual(38);
      expect(button.left, `${button.label} left edge`).toBeGreaterThanOrEqual(-1);
      expect(button.right, `${button.label} right edge`).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 1);
    }

    await page.getByRole('button', { name: 'Open analytics settings' }).click();
    const modalMetrics = await page.evaluate(() => {
      const modal = document.querySelector<HTMLElement>('.settings-modal')!.getBoundingClientRect();
      return {
        left: modal.left,
        right: modal.right,
        width: modal.width,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(modalMetrics.scrollWidth).toBeLessThanOrEqual(modalMetrics.viewportWidth + 1);
    expect(modalMetrics.left).toBeGreaterThanOrEqual(0);
    expect(modalMetrics.right).toBeLessThanOrEqual(modalMetrics.viewportWidth);
    expect(modalMetrics.width).toBeGreaterThan(340);
  });
});
