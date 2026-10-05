import { expect, test, type Page } from '@playwright/test';

/** M2: every account goes from login to "Committed" by clicking through, with no dead ends. */
const ACCOUNTS = [
  { id: 'hiren', name: 'Hiren Patel', start: 'Check if it pays (5 min)', skus: 2 },
  { id: 'ayesha', name: 'Ayesha Siddiqui', start: 'Check if it pays (5 min)', skus: 1 },
  { id: 'sunita', name: 'Sunita Das', start: 'Fix and relist', skus: 1 },
] as const;

async function listOne(page: Page) {
  await page.getByTestId('add-photos').click();
  await page.getByTestId('confirm-type').click();
  await page.getByRole('link', { name: 'Continue: Quantity' }).click();
  await expect(page.getByTestId('first-lot')).toBeVisible();
  const lot = await page.getByTestId('first-lot').innerText();
  await page.getByRole('link', { name: 'Continue: Price' }).click();
  await page.getByRole('link', { name: 'Continue: Who packs it?' }).click();
  await page.getByTestId('ff-self').click();
  await page.getByRole('link', { name: 'Continue', exact: true }).click();
  return lot;
}

for (const a of ACCOUNTS) {
  test(`${a.name}: login → committed`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto('/#/app');
    await page.getByRole('link', { name: `Log in as ${a.name}` }).click();
    await page.getByRole('link', { name: /Continue setup/ }).click();
    await page.getByRole('link', { name: a.start }).click();
    await expect(page.locator('h1')).toHaveText('Cost check');
    if (a.id === 'hiren') {
      await expect(page.getByTestId('break-even')).toHaveText('₹132');
      await expect(page.getByTestId('list-price')).toHaveText('₹148');
      await expect(page.getByTestId('take-home')).toHaveText('₹15');
      await expect(page.getByTestId('verdict')).toHaveText('It pays');
    }
    await page.getByRole('link', { name: /Sign up/ }).click();
    await page.getByTestId('type-wholesaler').check();
    await expect(page.getByTestId('records-result')).toContainText('Mismatch');
    await page.getByTestId('type-manufacturer').check();
    await page.getByRole('link', { name: 'Continue: Listing bot' }).click();
    const lots: string[] = [];
    for (let i = 0; i < a.skus; i++) lots.push(await listOne(page));
    if (a.id === 'hiren') expect(lots[0]).toBe('150');
    await expect(page.locator('h1')).toHaveText('Factory Launch Week');
    await page.getByTestId('commit-slot').click();
    await expect(page.getByTestId('committed')).toBeVisible();
    await page.getByRole('link', { name: 'Back to Today' }).first().click();
    await expect(page.getByTestId('stage-banner')).toContainText('Committed');
    expect(errors).toEqual([]);
  });
}
