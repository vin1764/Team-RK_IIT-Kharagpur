import { expect, test } from '@playwright/test';

test('journey: every chapter for every persona renders without errors; must-haves work', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));

  for (const id of ['hiren', 'ayesha', 'sunita']) {
    await page.goto(`/#/journey/${id}`);
    await expect(page.locator('h1')).toContainText('The journey');
    for (let n = 0; n <= 13; n++) {
      await expect(page.getByTestId('chapter-label')).toHaveText(`Chapter ${n} / 13`);
      await page.waitForTimeout(260);
      if (id === 'hiren') await page.screenshot({ path: `screenshots/sprint-b/hiren-ch${String(n).padStart(2, '0')}.png` });
      if (n < 13) await page.keyboard.press('ArrowRight');
    }
    if (id !== 'hiren') await page.screenshot({ path: `screenshots/sprint-b/${id}-ch13.png` });
  }

  // Ch 4: margin above B blocks go-live with the reason.
  await page.goto('/#/journey/hiren');
  for (let i = 0; i < 4; i++) await page.getByTestId('next-chapter').click();
  await expect(page.getByTestId('chapter-label')).toHaveText('Chapter 4 / 13');
  await page.getByRole('tab', { name: /Price/ }).click();
  await expect(page.getByRole('button', { name: /Go live/ })).toBeVisible();
  await page.getByLabel('Margin').fill('40');
  await expect(page.getByRole('alert')).toContainText('above B');
  await page.waitForTimeout(260);
  await page.screenshot({ path: 'screenshots/sprint-b/hiren-ch04-blocked.png' });

  // Counterfactual overlay and focus mode.
  await page.getByTestId('cf-toggle').check();
  await expect(page.getByText('Churns today').first()).toBeVisible();
  await page.getByRole('button', { name: 'Focus on Meesho control room' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshots/sprint-b/hiren-ch04-focus-control.png' });
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'screenshots/sprint-b/hiren-compare-chart.png' });

  // Every data-nav link on the journey resolves.
  const targets = await page.locator('[data-nav]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('data-nav')!))]);
  for (const t of targets) {
    await page.goto(`/#${t}`);
    await expect(page.getByTestId('not-found'), t).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
