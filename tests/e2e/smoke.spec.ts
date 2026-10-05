import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test('single file from disk: home, judge tour (14 steps), journey', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const file = pathToFileURL(resolve('dist-single/index.html')).href;
  await page.goto(file);
  await expect(page.locator('h1')).toContainText('Meesho Factory');
  await page.goto(`${file}#/notes`);
  await expect(page.locator('h1')).toContainText('Meesho C2M');
  await page.getByTestId('header-start-tour').click();
  for (let i = 1; i <= 13; i++) {
    await expect(page.getByTestId('tour-step')).toHaveText(`${i} / 13`);
    await expect(page.locator('h1')).toHaveCount(1);
    await page.keyboard.press('ArrowRight');
  }
  await expect(page.getByTestId('tour-step')).toHaveCount(0);
  // Case notes → choose a maker → that maker's journey.
  await page.goto(`${file}#/notes`);
  await page.getByRole('link', { name: 'See Sunita Das’s journey' }).click();
  await expect(page.locator('h1')).toHaveText('The journey: Sunita Das');
  await page.goto(`${file}#/journey/hiren?ch=10`);
  await expect(page.getByText('230 units').first()).toBeVisible();
  expect(errors).toEqual([]);
});
