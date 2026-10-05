import { expect, test } from '@playwright/test';

/** Hindi toggle on every maker screen. */
test('Hindi toggle works on every maker screen', async ({ page }) => {
  await page.goto('/#/app/today?as=hiren');
  await page.evaluate(() => localStorage.setItem('meesho-mvp:v1:account:hiren', JSON.stringify({ v: 1, day: 64 })));
  await page.reload();
  await page.getByTestId('lang-toggle').click();
  const screens: [string, string][] = [
    ['/app/today', 'नमस्ते, Hiren'],
    ['/app/inbox', 'सूचनाएँ'],
    ['/app/products', 'आपके प्रोडक्ट'],
    ['/app/orders', 'ऑर्डर'],
    ['/app/orders?tab=returns', 'रिटर्न और RTO'],
    ['/app/packpoint', 'पैक पॉइंट'],
    ['/app/coach', 'कोच'],
    ['/app/earnings', 'कमाई'],
    ['/app/more', 'और'],
    ['/app/start', ''],
    ['/app/check', 'लागत जाँच'],
    ['/app/signup', 'साइन अप'],
    ['/app/list/bottle-1l/product', 'लिस्टिंग बॉट: प्रोडक्ट'],
    ['/app/list/bottle-1l/fulfilment', 'पैकिंग कौन करेगा?'],
    ['/app/launch', 'लॉन्च डैशबोर्ड'],
  ];
  for (const [r, h1] of screens) {
    await page.goto(`/#${r}`);
    await expect(page.getByTestId('lang-toggle'), r).toHaveText(/EN/);
    await expect(page.getByRole('navigation', { name: 'App tabs' }), r).toContainText('आज');
    if (h1) await expect(page.locator('h1'), r).toHaveText(h1);
  }
});

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
