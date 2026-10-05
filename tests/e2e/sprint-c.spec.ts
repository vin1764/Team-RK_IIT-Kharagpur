import { expect, test } from '@playwright/test';

test('Sprint C pages, tabs, scenarios, verify and the judge tour', async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));

  for (const r of ['#/problem', '#/control-room', '#/break-it', '#/verify', '#/levers', '#/roadmap', '#/impact', '#/tour']) {
    await page.goto(`/${r}`);
    await expect(page.locator('h1')).toHaveCount(1);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `screenshots/sprint-c/${r.replace('#/', '')}.png`, fullPage: true });
    const targets = await page.locator('[data-nav]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('data-nav')!))]);
    for (const t of targets) {
      await page.goto(`/#${t}`);
      await expect(page.getByTestId('not-found'), `${r} → ${t}`).toHaveCount(0);
      await expect(page.locator('h1')).toHaveCount(1);
    }
  }

  await page.goto('/#/control-room');
  for (const t of ['Demand engine', 'Ledger', 'Pack Point', 'Launch', 'Coach & KAM', 'Cohort']) {
    await page.getByRole('tab', { name: t }).click();
    await page.waitForTimeout(150);
    await page.screenshot({ path: `screenshots/sprint-c/control-${t.replace(/\W+/g, '-').toLowerCase()}.png` });
  }
  await page.getByRole('tab', { name: 'Pack Point' }).click();
  for (const [m, fee] of [
    ['20', '₹44'],
    ['40', '₹30'],
    ['60', '₹26'],
    ['80', '₹23'],
  ]) {
    await page.getByLabel('Makers pooled').fill(m!);
    await expect(page.getByText('Fee per delivered order').locator('..').locator('..')).toContainText(fee!);
  }

  await page.goto('/#/break-it');
  for (const s of ['Launch flops', 'Maker raises price', 'Reseller signs up', 'Only 25 makers', 'Coach fix fails']) {
    await page.getByRole('button', { name: new RegExp(s) }).click();
    await expect(page.getByText('Guardrail that fired')).toBeVisible();
    await page.waitForTimeout(150);
    await page.screenshot({ path: `screenshots/sprint-c/breakit-${s.replace(/\W+/g, '-').toLowerCase()}.png` });
  }

  // Verify mode on the journey and the control room.
  await page.goto('/#/journey/hiren?ch=2');
  await page.getByTestId('verify-toggle').click();
  await page.locator('main [data-testid="num"]').first().click();
  await expect(page.getByTestId('formula-popover')).toBeVisible();
  await page.screenshot({ path: 'screenshots/sprint-c/verify-journey.png' });
  await page.keyboard.press('Escape');
  await page.goto('/#/control-room');
  await page.locator('main [data-testid="num"]').first().click();
  await expect(page.getByTestId('formula-popover')).toBeVisible();
  await page.getByTestId('verify-toggle').click();

  // Judge tour: start with the mouse, then keyboard only.
  await page.goto('/#/tour');
  await page.getByTestId('start-tour').click();
  const steps = 13;
  for (let i = 1; i <= steps; i++) {
    await expect(page.getByTestId('tour-step')).toHaveText(`${i} / ${steps}`);
    await expect(page.locator('h1')).toHaveCount(1);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `screenshots/sprint-c/tour-${String(i).padStart(2, '0')}.png` });
    await page.keyboard.press('ArrowRight');
  }
  await expect(page.getByTestId('tour-step')).toHaveCount(0);
  expect(errors).toEqual([]);
});
