import { expect, test, type Page } from '@playwright/test';

type ProbeState = {
  canvasCalls: number;
  longTasks: Array<{ duration: number; name: string; startTime: number }>;
  mutationBatches: number;
};

declare global {
  interface Window {
    __analyticsProbe: ProbeState;
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__analyticsProbe = {
      canvasCalls: 0,
      longTasks: [],
      mutationBatches: 0,
    };

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__analyticsProbe.longTasks.push({
            duration: entry.duration,
            name: entry.name,
            startTime: entry.startTime,
          });
        }
      }).observe({ entryTypes: ['longtask'] });
    } catch {
      // Chromium supports Long Task entries; this keeps the test harmless elsewhere.
    }

    const originalStroke = CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.stroke = function (...args) {
      window.__analyticsProbe.canvasCalls += 1;
      return originalStroke.apply(this, args);
    };
  });
});

test('time window changes do not create browser long tasks', async ({ page, baseURL }) => {
  const consoleMessages: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (text.includes('[Violation]') || text.includes('setTimeout') || text.includes('handler took')) {
      consoleMessages.push(text);
    }
  });

  await page.goto(baseURL ?? '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1_000);

  await page.evaluate(() => {
    window.__analyticsProbe.longTasks = [];
    window.__analyticsProbe.canvasCalls = 0;
    window.__analyticsProbe.mutationBatches = 0;

    const target = document.querySelector('.analytics-root');
    if (!target) return;

    const observer = new MutationObserver(() => {
      window.__analyticsProbe.mutationBatches += 1;
    });
    observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
  });

  const steps = [];
  for (const label of ['1H', '6H', '24H', '3D', '7D', '1H']) {
    steps.push(await clickWindowAndReadProbe(page, label));
  }

  const longTasks = steps.flatMap((step) => step.longTasks.map((task) => ({ step: step.label, ...task })));
  expect(longTasks).toEqual([]);
  expect(consoleMessages).toEqual([]);
});

async function clickWindowAndReadProbe(page: Page, label: string) {
  await page.evaluate(() => {
    window.__analyticsProbe.longTasks = [];
    window.__analyticsProbe.canvasCalls = 0;
    window.__analyticsProbe.mutationBatches = 0;
  });

  await page.getByRole('button', { exact: true, name: label }).click();
  await expect(page.locator('.segmented button.active')).toHaveText(label);
  await page.waitForTimeout(700);

  return page.evaluate((stepLabel) => ({
    label: stepLabel,
    ...window.__analyticsProbe,
  }), label);
}
