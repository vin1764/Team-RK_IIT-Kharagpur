import { expect, test } from '@playwright/test';

test('journey phones fit 1366×768, with and without the tour bar; phone text ≥ 11 px', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const check = async (label: string) => {
    for (const name of ['Maker phone', 'Buyer phone']) {
      const box = await page.getByRole('region', { name }).boundingBox();
      expect(box, `${name} ${label}`).not.toBeNull();
      expect(box!.y + box!.height, `${name} bottom ${label}`).toBeLessThanOrEqual(768);
    }
    const smallest = await page.evaluate(() =>
      Math.min(
        ...[...document.querySelectorAll('[aria-label="Maker phone"] *, [aria-label="Buyer phone"] *')]
          .filter((el) => (el as HTMLElement).innerText?.trim() && el.children.length === 0)
          .map((el) => parseFloat(getComputedStyle(el).fontSize)),
      ),
    );
    expect(smallest, `smallest phone text ${label}`).toBeGreaterThanOrEqual(11);
  };
  for (const ch of [0, 4, 5, 7, 8, 10, 12]) {
    await page.goto(`/#/journey/hiren?ch=${ch}`);
    await page.waitForTimeout(300);
    await check(`ch${ch}`);
  }
  await page.screenshot({ path: 'screenshots/fit/journey-1366.png' });
  await page.goto('/#/tour');
  await page.getByTestId('start-tour').click();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('tour-step')).toHaveText('7 / 15');
  await page.waitForTimeout(400);
  await check('during tour');
  await page.screenshot({ path: 'screenshots/fit/journey-tour-1366.png' });
});
