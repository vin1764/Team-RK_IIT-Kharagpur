import { expect, test } from '@playwright/test';

test('Cluster Pack Point: flow in the journey, control room tab, Economics P&L', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));

  // Journey chapters 5, 6, 7 show the node flow for Hiren.
  for (const ch of [5, 6, 7]) {
    await page.goto(`/#/journey/hiren?ch=${ch}`);
    await expect(page.getByTestId('pack-point-flow').first()).toBeVisible();
    await page.getByRole('button', { name: 'Focus on Meesho control room' }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `screenshots/pack-point/journey-ch${ch}.png`, fullPage: true });
  }
  // Day-69 casserole inbound weigh-in and swap weights in the event log.
  await page.goto('/#/journey/hiren?ch=13');
  await expect(page.getByLabel('Event log')).toContainText('counted and weighed');
  await expect(page.getByLabel('Event log')).toContainText('g vs dispatch');
  await expect(page.getByLabel('Event log')).toContainText('Launch 2 offline makers');

  await page.goto('/#/control-room');
  await page.getByRole('tab', { name: 'Pack Point' }).click();
  await expect(page.getByTestId('pack-point-flow')).toBeVisible();
  await expect(page.getByText('Who uses the Rajkot node')).toBeVisible();
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'screenshots/pack-point/control-room.png', fullPage: true });

  await page.goto('/#/economics');
  await expect(page.locator('h1')).toHaveText('Unit economics');
  const slider = page.getByLabel('Makers pooled (P&L)');
  for (const [m, fee] of [
    ['20', '₹44'],
    ['40', '₹30'],
    ['60', '₹26'],
    ['80', '₹23'],
  ] as const) {
    await slider.fill(m);
    await expect(page.getByText(`fee ${fee} per delivered order`).first()).toBeVisible();
  }
  await page.getByRole('button', { name: /casserole \(Pack Point\)/ }).click();
  await expect(page.getByText('Pack Point partner (fee at 40+ makers)')).toBeVisible();
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'screenshots/pack-point/economics.png', fullPage: true });
  expect(errors).toEqual([]);
});
