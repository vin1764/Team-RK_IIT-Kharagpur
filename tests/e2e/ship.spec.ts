import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const SIZES = [
  { w: 1366, h: 768 },
  { w: 1920, h: 1080 },
];

test('Landing, Journey and Control room at 1366×768 and 1920×1080: no horizontal overflow', async ({ page }) => {
  for (const s of SIZES) {
    await page.setViewportSize({ width: s.w, height: s.h });
    for (const r of ['#/', '#/journey/hiren?ch=7', '#/control-room']) {
      await page.goto(`/${r}`);
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${r} at ${s.w}`).toBeLessThanOrEqual(0);
      const name = r === '#/' ? 'landing' : r.includes('journey') ? 'journey' : 'control-room';
      await page.screenshot({ path: `screenshots/ship/${name}-${s.w}.png` });
    }
  }
});

test('single-file build opens from disk and hash routing works', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const file = pathToFileURL(resolve('dist-single/index.html')).href;
  await page.goto(file);
  await expect(page.locator('h1')).toContainText('Meesho C2M');
  for (const [hash, h1] of [
    ['#/journey/hiren?ch=10', 'The journey: Hiren Patel'],
    ['#/categories', 'Category Lab'],
    ['#/control-room', 'Meesho control room'],
    ['#/break-it', 'What-if lab'],
  ] as const) {
    await page.goto(`${file}${hash}`);
    await expect(page.locator('h1')).toContainText(h1);
  }
  // In-app navigation by clicking, still from disk.
  await page.getByRole('link', { name: 'Personas' }).first().click();
  await expect(page).toHaveURL(/#\/personas$/);
  await expect(page.locator('h1')).toContainText('Three cohorts');
  await page.screenshot({ path: 'screenshots/ship/single-file-personas.png' });
  expect(errors).toEqual([]);
});
