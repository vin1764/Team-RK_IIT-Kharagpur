import { expect, test, type Page } from '@playwright/test';

/** M3: "Jump to next nudge" walks Hiren from day −7 to day 90; every nudge CTA opens the right screen. */
const H1: [RegExp, RegExp][] = [
  [/^\/app\/launch$/, /Factory Launch Week|Launch dashboard/],
  [/^\/app\/orders\?tab=returns/, /Returns and RTO/],
  [/^\/app\/orders$/, /^Orders$/],
  [/^\/app\/packpoint$/, /Pack Point/],
  [/^\/app\/products\/[\w-]+$/, /steel|bottle|sipper|casserole|lunch box/i],
  [/^\/app\/products$/, /Your products/],
  [/^\/app\/coach$/, /Coach/],
  [/^\/app\/earnings$/, /Earnings/],
  [/^\/app\/more$/, /More/],
  [/^\/app\/list\/[\w-]+\/product$/, /Listing bot/],
];

const expectedH1 = (route: string) => H1.find(([r]) => r.test(route))?.[1];

async function setDay(page: Page, id: string, day: number) {
  await page.evaluate(
    ([id, day]) => {
      const k = `meesho-mvp:v1:account:${id}`;
      const s = JSON.parse(localStorage.getItem(k) ?? 'null');
      localStorage.setItem(k, JSON.stringify({ ...s, day }));
    },
    [id, day] as const,
  );
}

test('jump through every Hiren nudge; each CTA opens its screen', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/#/app/today?as=hiren');
  await page.getByTestId('next-day').click(); // creates the saved state
  await setDay(page, 'hiren', -7);
  await page.reload();
  await expect(page.getByTestId('demo-day')).toHaveText('Day −7');

  const seenTypes = new Map<string, number>();
  const routes = new Set<string>();
  let jumps = 0;
  while (await page.getByTestId('jump-nudge').isEnabled()) {
    await page.getByTestId('jump-nudge').click();
    jumps++;
    const day = Number((await page.getByTestId('demo-day').innerText()).replace('Day ', '').replace('−', '-'));
    const cards = page.locator('[data-nudge-id]');
    const n = await cards.count();
    expect(n, `nudges shown on day ${day}`).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const card = cards.nth(i);
      const type = (await card.getAttribute('data-testid'))!.replace('nudge-', '');
      const link = card.locator('a[data-nav]').first();
      if ((await link.count()) === 0) continue;
      const route = (await link.getAttribute('data-nav'))!;
      routes.add(route);
      if (seenTypes.has(type)) continue;
      seenTypes.set(type, day);
      await link.click();
      await expect(page.getByTestId('not-found')).toHaveCount(0);
      const want = expectedH1(route);
      expect(want, `known route ${route}`).toBeTruthy();
      await expect(page.locator('h1'), `${type} → ${route}`).toHaveText(want!);
      if (route.includes('&ret=') && (type === 'claim_reminder' || type === 'return_at_node')) await expect(page.getByTestId('return-highlight').first()).toBeVisible();
      await page.goto('/#/app/today');
      break; // the card list changed (read state); re-query on the next jump
    }
  }
  console.log(`Jumps: ${jumps}; types opened: ${[...seenTypes].map(([t, d]) => `${t}@${d}`).join(', ')}`);
  expect(await page.getByTestId('demo-day').innerText()).toMatch(/Day (8\d|90)/);
  for (const t of ['make_first_lot', 'stock_in_reminder', 'launch_live', 'new_order_pack', 'valmo_pickup', 'day30_result', 'restock_batch', 'coach_fix', 'price_alert', 'stop_sku', 'switch_sku', 'send_lot_packpoint']) {
    expect([...seenTypes.keys()], t).toContain(t);
  }
  // Every distinct CTA path opens a real screen.
  for (const r of new Set([...routes].map((x) => x.replace(/&ret=.*$/, '')))) {
    await page.goto(`/#${r}`);
    await expect(page.getByTestId('not-found'), r).toHaveCount(0);
    await expect(page.locator('h1'), r).toHaveText(expectedH1(r)!);
  }
  // Ops console nudge log mirrors them with causes.
  await page.goto('/#/ops');
  await expect(page.getByTestId('nudge-log')).toContainText('restock_batch fired for Hiren · run-rate 11/day · reorder point 77');
  expect(errors).toEqual([]);
});

test('urgent nudge puts a red dot on the Today tab', async ({ page }) => {
  await page.goto('/#/app/today?as=ayesha');
  await page.getByTestId('next-day').click();
  // Ayesha's stock-out is urgent.
  await page.goto('/#/ops');
  await page.goto('/#/app/today?as=ayesha');
  await page.evaluate(() => {
    const k = 'meesho-mvp:v1:account:ayesha';
    const s = JSON.parse(localStorage.getItem(k)!);
    localStorage.setItem(k, JSON.stringify({ ...s, day: 21 }));
  });
  await page.reload();
  await expect(page.getByTestId('urgent-dot')).toHaveCount(0);
  // Walk forward until a stock-out (urgent) shows.
  for (let i = 0; i < 70; i++) {
    if ((await page.getByTestId('nudge-stock_out').count()) > 0) break;
    await page.getByTestId('jump-nudge').click();
  }
  await expect(page.getByTestId('nudge-stock_out')).toBeVisible();
  await expect(page.getByTestId('urgent-dot')).toBeVisible();
});
