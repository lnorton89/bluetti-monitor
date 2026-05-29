import { expect, test } from '@playwright/test';

const SKINS = ['modern', 'classic', 'aurora', 'terminal', 'blueprint', 'brutalist', 'clay', 'win95', 'win2k', 'winaero'];
const THEMES = ['dark', 'light'] as const;

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function rgbaToHex(rgb: string): string | null {
  const m = rgb.replace(/\s/g, '').match(/rgba?\((\d+),(\d+),(\d+)/);
  if (!m) return null;
  const [r, g, b] = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function isTransparent(bg: string): boolean {
  const s = bg.replace(/\s/g, '');
  if (s === 'transparent' || s === 'rgba(0,0,0,0)') return true;
  const m = s.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
  if (m && parseFloat(m[4]) === 0) return true;
  return false;
}

interface FontIssue {
  skin: string;
  theme: string;
  element: string;
  text: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  color: string;
  bgColor: string;
  contrast: number;
  issue: string;
}

test.describe('Font readability audit across all skins and themes', () => {
  for (const skin of SKINS) {
    for (const theme of THEMES) {
      test(`${skin}/${theme}: check font contrast and rendering`, async ({ page }) => {
        const issues: FontIssue[] = [];

        await page.goto('/?mock=1');
        await page.evaluate(
          ({ s, t }: { s: string; t: string }) => {
            window.localStorage.setItem('bluetti-analytics:skin', s);
            window.localStorage.setItem('bluetti-analytics:theme', t);
            document.documentElement.setAttribute('data-analytics-skin', s);
            document.documentElement.setAttribute('data-analytics-theme', t);
          },
          { s: skin, t: theme },
        );
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        if (await page.locator('.empty-state').isVisible()) {
          test.skip();
          return;
        }

        // ----- Font loading -----
        const loadedFonts = await page.evaluate(() =>
          document.fonts.ready.then(() =>
            [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
          ),
        );
        const rootFont = await page.evaluate(() => getComputedStyle(document.documentElement).fontFamily);
        console.log(`[${skin}/${theme}] Font: ${rootFont.split(',')[0].trim()} | Loaded: ${loadedFonts.join(', ') || 'none'}`);

        // ----- Font family check -----
        if (skin === 'win95' && !rootFont.includes('sans-serif') && !rootFont.includes('serif') && !rootFont.includes('monospace')) {
          console.log(`  WARN win95 font "${rootFont}" is a system font not guaranteed on all OS`);
        }
        if (!loadedFonts.length && !rootFont.includes('sans-serif') && !rootFont.includes('serif') && !rootFont.includes('monospace')) {
          console.log(`  WARN no custom fonts loaded, skin relies on system fonts`);
        }

        // ----- Contrast audit -----
        const selectors = [
          'h1', 'h2', 'p', 'strong', '.kpi-topline span',
          '.kpi strong', '.kpi small', '.side-stat strong', '.side-stat span',
          '.snapshot-cell strong', '.snapshot-cell span', '.chip',
          '.status-pill', '.eyebrow', '.panel-header h2', '.panel-header p',
          '.control-field span', '.segmented button', '.legend-strip span',
          '.field-row strong', '.field-row span',
          '.search-box input', 'select', '.date-picker-flyout-header h2',
          '.dense-chart text',
        ];

        for (const selector of selectors) {
          const elements = page.locator(selector);
          const count = await elements.count();
          for (let i = 0; i < Math.min(count, 5); i++) {
            const el = elements.nth(i);
            if (!(await el.isVisible())) continue;
            const text = ((await el.textContent()) || '').trim();
            if (!text) continue;

            const result = await el.evaluate((node) => {
              function hasAlphaZero(bg: string): boolean {
                const m = bg.replace(/\s/g, '').match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
                return bg === 'transparent' || (!!m && parseFloat(m[4]) === 0);
              }
              function hasNone(fill: string): boolean {
                return fill === 'none' || fill === '';
              }
              function resolveEffectiveBg(el: Element | null): string {
                if (!el) return 'rgb(255,255,255)';
                const bg = getComputedStyle(el).backgroundColor;
                if (bg && !hasAlphaZero(bg)) return bg;
                return resolveEffectiveBg(el.parentElement);
              }
              const style = getComputedStyle(node);
              const isSvg = node instanceof SVGElement;
              const textColor = isSvg && !hasNone(style.fill) ? style.fill : style.color;
              return {
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                color: textColor,
                effectiveBg: resolveEffectiveBg(node),
                hasGradientBg: style.backgroundImage !== 'none',
              };
            });

            if (result.hasGradientBg) continue;

            const colorHex = rgbaToHex(result.color);
            const bgHex = rgbaToHex(result.effectiveBg);
            if (!colorHex || !bgHex) continue;

            const ratio = contrastRatio(colorHex, bgHex);
            const px = parseFloat(result.fontSize);
            const w = parseInt(result.fontWeight);
            const isLarge = px >= 18 || (px >= 14 && w >= 700);
            const threshold = isLarge ? AA_LARGE : AA_NORMAL;

            if (ratio < threshold) {
              issues.push({
                skin, theme,
                element: `${selector}[${i}]`,
                text: text.slice(0, 60),
                fontFamily: result.fontFamily,
                fontSize: result.fontSize,
                fontWeight: result.fontWeight,
                color: colorHex,
                bgColor: bgHex,
                contrast: Math.round(ratio * 100) / 100,
                issue: `needs ${threshold}:1, got ${Math.round(ratio * 100) / 100}:1`,
              });
            }
          }
        }

        // ----- Log findings -----
        for (const issue of issues) {
          const tag = issue.contrast < 3 ? 'SEVERE' : issue.contrast < AA_NORMAL ? 'LOW' : 'WARN';
          console.log(`  ${tag} ${issue.element} "${issue.text}" ${issue.color}/${issue.bgColor} ${issue.issue}`);
        }

        await page.screenshot({ path: `test-results/fonts/${skin}-${theme}.png`, fullPage: true });

        // Only fail on contrast < 3:1 for ANY text size
        const severeIssues = issues.filter((i) => i.contrast < 3);
        expect(severeIssues).toEqual([]);
      });
    }
  }
});
