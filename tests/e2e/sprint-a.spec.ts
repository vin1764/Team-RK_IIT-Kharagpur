import { expect, test } from '@playwright/test';

const PAGES = ['#/', '#/personas', '#/personas/hiren', '#/personas/ayesha', '#/personas/sunita', '#/categories'];

test('Sprint A pages: render, no console errors, every data-nav link resolves; screenshots at 1366×768', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  for (const r of PAGES) {
    await page.goto(`/${r}`);
    await expect(page.locator('h1')).toHaveCount(1);
    await page.waitForTimeout(300);
    const name = r.replace('#/', '').replace(/\//g, '-') || 'landing';
    await page.screenshot({ path: `screenshots/sprint-a/${name}-fold.png` });
    await page.screenshot({ path: `screenshots/sprint-a/${name}-full.png`, fullPage: true });
    const targets = await page.locator('[data-nav]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('data-nav')!))]);
    for (const t of targets) {
      await page.goto(`/#${t}`);
      await expect(page.getByTestId('not-found'), `${r} → ${t}`).toHaveCount(0);
      await expect(page.locator('h1')).toHaveCount(1);
    }
  }
  // Category Lab: making returns matter less lifts Apparel and shows why it still waits.
  await page.goto('/#/categories');
  await page.getByLabel('Savings after RTO weight').fill('0');
  await page.getByLabel('Spec verifiability weight').fill('0');
  await expect(page.getByTestId('apparel-note')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/sprint-a/categories-reweighted-fold.png' });
  expect(errors).toEqual([]);
});
