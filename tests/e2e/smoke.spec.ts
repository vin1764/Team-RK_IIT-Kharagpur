import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test('single file from disk: home, judge tour (14 steps), journey', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const file = pathToFileURL(resolve('dist-single/index.html')).href;
  await page.goto(file);
  await expect(page.locator('h1')).toContainText('Meesho C2M');
  await page.getByTestId('header-start-tour').click();
  for (let i = 1; i <= 14; i++) {
    await expect(page.getByTestId('tour-step')).toHaveText(`${i} / 14`);
    await expect(page.locator('h1')).toHaveCount(1);
    await page.keyboard.press('ArrowRight');
  }
  await expect(page.getByTestId('tour-step')).toHaveCount(0);
  await page.goto(`${file}#/journey/hiren?ch=10`);
  await expect(page.getByText('230 units').first()).toBeVisible();
  expect(errors).toEqual([]);
});
