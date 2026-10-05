import { test } from '@playwright/test';

/** Visual checks (run with SHOTS=<dir>): projector 1366×768 and phone 390×844. */
const dir = process.env.SHOTS;
const ROUTES = (process.env.SHOT_ROUTES ?? '/#/,/#/app,/#/app/today?as=hiren,/#/app/start,/#/app/check,/#/app/launch').split(',');

for (const vp of [
  { name: 'desk', width: 1366, height: 768 },
  { name: 'phone', width: 390, height: 844 },
]) {
  test(`shots ${vp.name}`, async ({ page }) => {
    test.skip(!dir, 'set SHOTS to a directory to take screenshots');
    await page.setViewportSize({ width: vp.width, height: vp.height });
    if (process.env.SHOT_DAY) {
      await page.goto('/#/app/today?as=hiren');
      await page.evaluate((d) => {
        for (const id of ['hiren', 'ayesha', 'sunita']) {
          const k = `meesho-mvp:v1:account:${id}`;
          const s = JSON.parse(localStorage.getItem(k) ?? 'null');
          if (s) localStorage.setItem(k, JSON.stringify({ ...s, day: Number(d) }));
        }
      }, process.env.SHOT_DAY);
    }
    for (const [i, r] of ROUTES.entries()) {
      await page.goto(r);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${dir}/${vp.name}-${i}.png` });
    }
  });
}
