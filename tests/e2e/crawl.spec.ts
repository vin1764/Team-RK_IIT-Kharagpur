import { expect, test, type Page } from '@playwright/test';

/**
 * Link crawler: starts at #/, clicks every element with data-nav on every reachable page,
 * and asserts: no not-found page, no console errors, exactly one h1, and a "next" path.
 */

const hashOf = (page: Page) => new URL(page.url()).hash || '#/';
const toHash = (to: string) => `#${to}`;

async function assertHealthyPage(page: Page, where: string) {
  await expect(page.getByTestId('not-found'), `not-found on ${where}`).toHaveCount(0);
  await expect(page.locator('h1'), `one h1 on ${where}`).toHaveCount(1);
  await expect(page.locator('h1')).not.toBeEmpty();
  // Not blank: the page has real content beyond the header.
  expect((await page.locator('main').innerText()).length, `content on ${where}`).toBeGreaterThan(200);
  await expect(page.locator('[data-next]').first(), `next path on ${where}`).toBeVisible();
}

test('every data-nav link and button works, from #/ onward', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${hashOf(page)}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${hashOf(page)}: ${e.message}`));

  // The hidden styleguide isn't linked from the nav, so it is seeded explicitly.
  const queue = ['#/', '#/styleguide'];
  const visited = new Set<string>();
  let clicks = 0;

  while (queue.length > 0) {
    const route = queue.shift()!;
    if (visited.has(route)) continue;
    visited.add(route);

    await page.goto(`/${route}`);
    await assertHealthyPage(page, route);

    const targets = await page.locator('[data-nav]').evaluateAll((els) => els.map((e) => e.getAttribute('data-nav')!));
    expect(targets.length, `links on ${route}`).toBeGreaterThan(0);

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]!;
      if (hashOf(page) !== route) await page.goto(`/${route}`);
      await page.locator('[data-nav]').nth(i).click();
      await expect.poll(() => hashOf(page), { message: `click ${target} on ${route}` }).toBe(toHash(target));
      await assertHealthyPage(page, `${route} → ${target}`);
      clicks++;
      if (!visited.has(toHash(target))) queue.push(toHash(target));
    }
  }

  // Every section in the IA was reached by clicking.
  for (const r of [
    '#/', '#/problem', '#/categories', '#/personas', '#/personas/hiren', '#/personas/ayesha', '#/personas/sunita',
    '#/journey/hiren', '#/journey/ayesha', '#/journey/sunita', '#/control-room', '#/impact',
    '#/levers', '#/break-it', '#/verify', '#/roadmap', '#/tour',
  ]) {
    expect(visited, `reached ${r}`).toContain(r);
  }
  expect(errors).toEqual([]);
  console.log(`Crawled ${visited.size} routes, ${clicks} clicks.`);
});

test('unknown routes show a not-found page with a way back', async ({ page }) => {
  await page.goto('/#/no-such-page');
  await expect(page.getByTestId('not-found')).toBeVisible();
  await page.locator('[data-next]').click();
  await expect.poll(() => hashOf(page)).toBe('#/');
  await page.goto('/#/personas/nobody');
  await expect(page.getByTestId('not-found')).toBeVisible();
});
