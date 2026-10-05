import { expect, test } from '@playwright/test';

/** M5: the ops console tabs, synced to the maker app's demo clock. */
const TABS: [string, RegExp][] = [
  ['Nudge log', /fired for Hiren/],
  ['Demand engine', /B|benchmark/i],
  ['Ledger', /orders\s*\/\s*week|per week/i],
  ['Launch Week', /Order book and slot allocation/],
  ['Pack Point node', /Storage queue/],
  ['Coach & escalation', /Makers per category manager/],
  ['Cohort metrics', /Cohort metrics vs targets/],
];

test('ops console: every tab renders, synced to the demo clock', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/#/app/today?as=hiren');
  await page.evaluate(() => localStorage.setItem('meesho-mvp:v1:account:hiren', JSON.stringify({ v: 1, day: 78 })));
  await page.goto('/#/ops');
  await page.reload();
  await expect(page.getByTestId('as-of')).toHaveText('As of Day 78');
  for (const [i, [tab, text]] of TABS.entries()) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.locator('main')).toContainText(text);
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/ops-${i}.png`, fullPage: true });
  }
  // Moving the ops day moves the maker's demo clock.
  await page.getByRole('button', { name: 'Day 30' }).click();
  await page.goto('/#/app/today');
  await expect(page.getByTestId('demo-day')).toHaveText('Day 30');
  expect(errors).toEqual([]);
});
