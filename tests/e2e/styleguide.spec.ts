import { expect, test } from '@playwright/test';

test('styleguide renders every component, Verify popovers and the Hindi toggle work', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/#/styleguide');
  await expect(page.getByTestId('styleguide')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Maker phone' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Buyer phone' })).toBeVisible();
  await expect(page.getByLabel('Impact tracker')).toBeVisible();
  await expect(page.getByLabel('Event log')).toBeVisible();

  // Worked numbers come through from formulas.ts.
  const demo = page.getByTestId('verify-demo');
  await expect(demo).toContainText('₹132');
  await expect(demo).toContainText('₹148');
  await expect(demo).toContainText('₹15');

  // Verify mode: a number opens its formula, inputs and sources.
  await page.getByTestId('verify-toggle').click();
  await demo.getByTestId('num').first().click();
  const pop = page.getByTestId('formula-popover');
  await expect(pop).toBeVisible();
  await expect(pop).toContainText('Break-even price');
  await expect(pop).toContainText('Making cost');
  await page.keyboard.press('Escape');
  await expect(pop).toHaveCount(0);

  // A constant shows its source and status.
  await demo.getByTestId('num').nth(3).click();
  await expect(page.getByTestId('formula-popover')).toContainText('Meesho supplier portal');
  await page.keyboard.press('Escape');
  await page.getByTestId('verify-toggle').click();

  // Maker phone: Hindi / English.
  await expect(page.getByTestId('maker-forecast')).toHaveText('A forecast, not a guarantee');
  await page.getByTestId('lang-toggle').click();
  await expect(page.getByTestId('maker-forecast')).toHaveText('यह अनुमान है, पक्का वादा नहीं');
  await page.getByTestId('lang-toggle').click();

  // Scroll to the top so the sticky header sits at the top of the full-page capture.
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: 'screenshots/styleguide-1366.png', fullPage: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: 'screenshots/styleguide-1920.png', fullPage: true });

  expect(errors).toEqual([]);
});

test('settings: seed and reset scenario', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const seed = page.getByLabel('Simulation seed');
  const initial = await seed.inputValue();
  await seed.fill('7');
  await expect(seed).toHaveValue('7');
  await page.getByRole('button', { name: 'Reset scenario' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByLabel('Simulation seed')).toHaveValue(initial);
});
