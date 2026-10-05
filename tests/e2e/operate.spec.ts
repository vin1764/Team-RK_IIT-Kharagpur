import { expect, test, type Page } from '@playwright/test';

/** M4: operating screens. Orders (pack → hand over), returns, Pack Point, make-to-demand switch, escalation, prepaid. */
async function at(page: Page, id: string, day: number, path = '/app/today') {
  await page.goto(`/#/app/today?as=${id}`);
  await page.evaluate(
    ([id, day]) => {
      const k = `meesho-mvp:v1:account:${id}`;
      const s = JSON.parse(localStorage.getItem(k) ?? '{"v":1}');
      localStorage.setItem(k, JSON.stringify({ ...s, day }));
    },
    [id, day] as const,
  );
  await page.goto(`/#${path}`);
  await page.reload();
}

test.describe.configure({ timeout: 90_000 });

test.beforeEach(({ page }) => {
  page.on('pageerror', (e) => {
    throw e;
  });
});

test('Hiren, day 21: pack then hand over today’s bottles; the nudges clear', async ({ page }) => {
  await at(page, 'hiren', 21, '/app/orders');
  await expect(page.locator('h1')).toHaveText('Orders');
  await expect(page.getByTestId('nudge-valmo_pickup')).toBeVisible();
  await page.getByTestId('btn-packed').first().click();
  await expect(page.getByTestId('order-status').first()).toHaveText('Packed · waiting for pickup');
  await page.getByTestId('btn-handed').first().click();
  await expect(page.getByTestId('order-status').first()).toHaveText('Handed over to Valmo');
  await page.goto('/#/app/today');
  await expect(page.getByTestId('nudge-new_order_pack').filter({ hasText: 'bottle' }).locator('[data-testid="act-packed"]')).toHaveCount(0);
});

test('Hiren: "not ready" at pickup makes the next day urgent', async ({ page }) => {
  await at(page, 'hiren', 22, '/app/today');
  await page.getByTestId('nudge-valmo_pickup').getByTestId('act-not_ready').click();
  await page.getByTestId('next-day').click();
  await expect(page.getByTestId('nudge-dispatch_deadline').first()).toBeVisible();
  await expect(page.getByTestId('urgent-dot')).toBeVisible();
  const before = await page.getByTestId('nudge-dispatch_deadline').count();
  await page.getByTestId('nudge-dispatch_deadline').first().getByTestId('act-handed').click();
  await expect(page.getByTestId('nudge-dispatch_deadline')).toHaveCount(before - 1);
});

test('Hiren: Pack Point shows lots counted vs sent and the storage clock', async ({ page }) => {
  await at(page, 'hiren', 78, '/app/packpoint');
  await expect(page.locator('h1')).toHaveText('Pack Point');
  await expect(page.getByText(/sent \d+ · counted \d+/).first()).toBeVisible();
  await expect(page.getByText(/day \d+ of 30 free/).first()).toBeVisible();
  await at(page, 'ayesha', 78, '/app/packpoint');
  await expect(page.getByText(/no Pack Point in Moradabad/)).toBeVisible();
});

test('Hiren, day 64: sipper stopped → make the casserole instead via the listing bot → Pack Point', async ({ page }) => {
  await at(page, 'hiren', 64, '/app/products');
  await expect(page.getByTestId('status-sipper-750')).toHaveText('Stop');
  await page.getByRole('link', { name: 'List it (2 min)' }).first().click();
  await expect(page.locator('h1')).toHaveText('Listing bot: Product');
  await page.getByRole('link', { name: 'Continue: Quantity' }).click();
  await page.getByRole('link', { name: 'Continue: Price' }).click();
  await page.getByRole('link', { name: 'Continue: Who packs it?' }).click();
  await expect(page.getByTestId('ff-reason')).toContainText('41 makers');
  await page.getByTestId('ff-packPoint').click();
  await page.getByRole('link', { name: 'Continue', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('1.5 L steel casserole');
});

test('Hiren: returns tab highlights the item from a claim nudge', async ({ page }) => {
  await at(page, 'hiren', 35, '/app/today');
  const claim = page.getByTestId('nudge-claim_reminder').first();
  await claim.getByRole('link').click();
  await expect(page.locator('h1')).toHaveText('Returns and RTO');
  await expect(page.getByTestId('return-highlight').first()).toBeVisible();
  await page.getByTestId('nudge-claim_reminder').first().getByTestId('act-claimed').click();
});

test('Sunita: escalation shows on More, once', async ({ page }) => {
  await at(page, 'sunita', 90, '/app/more');
  await expect(page.getByTestId('escalation-status')).toContainText('category manager called you');
  await page.getByRole('link', { name: /^Inbox/ }).click();
  await expect(page.locator('h1')).toHaveText('Inbox');
  await expect(page.getByTestId('nudge-escalation_call')).toHaveCount(1);
});

test('Ayesha: prepaid nudge → turn on the offer on the product screen', async ({ page }) => {
  await at(page, 'ayesha', 21, '/app/today');
  for (let i = 0; i < 60 && (await page.getByTestId('nudge-prepaid_nudge').count()) === 0; i++) await page.getByTestId('jump-nudge').click();
  await page.getByTestId('nudge-prepaid_nudge').first().getByRole('link').click();
  await expect(page.locator('h1')).toContainText('bowl set');
  await page.getByTestId('nudge-prepaid_nudge').first().getByTestId('act-prepaid_on').click();
  await expect(page.getByText('Prepaid offer').locator('..')).toContainText('On');
});

test('Earnings never shows a negative take-home and shows the four money lines', async ({ page }) => {
  await at(page, 'hiren', 90, '/app/earnings');
  for (const t of ['Earned (accrued)', 'Paid out', 'Cash in stock (at cost)', 'Days of cover', 'Net cash position']) await expect(page.getByText(t, { exact: true })).toBeVisible();
  await expect(page.getByTestId('earned')).not.toContainText('-');
});
