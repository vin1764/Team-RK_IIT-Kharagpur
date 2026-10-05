import { expect, test } from '@playwright/test';

/** MVP shell: separate state per account, demo clock, reset. */
test('accounts keep separate state; next day and reset work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/#/');
  await page.getByRole('link', { name: 'Open the Maker app' }).click();
  await page.getByRole('link', { name: 'Log in as Hiren Patel' }).click();
  await expect(page.locator('h1')).toHaveText('Namaste, Hiren');
  await expect(page.getByTestId('demo-day')).toHaveText('Day −14');
  for (let i = 0; i < 3; i++) await page.getByTestId('next-day').click();
  await expect(page.getByTestId('demo-day')).toHaveText('Day −11');

  await page.goto('/#/app');
  await page.getByRole('link', { name: 'Log in as Ayesha Siddiqui' }).click();
  await expect(page.locator('h1')).toHaveText('Namaste, Ayesha');
  await expect(page.getByTestId('demo-day')).toHaveText('Day −14');

  // Survives a reload (localStorage).
  await page.goto('/#/app/today?as=hiren');
  await page.reload();
  await expect(page.getByTestId('demo-day')).toHaveText('Day −11');

  await page.getByTestId('reset-account').click();
  await page.getByTestId('confirm-reset').click();
  await expect(page.getByTestId('demo-day')).toHaveText('Day −14');
  expect(errors).toEqual([]);
});
