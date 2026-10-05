# Meesho C2M: factories to buyers (Team RK, IIT Kharagpur)

A clickable, fully offline prototype of our solution: how an integrated manufacturer is found,
onboarded, launched and grown on Meesho over 90 days, and what changes for the **maker**, the
**buyer** and **Meesho**. All data is synthetic and **hardcoded** (`src/data/snapshot.json` and
`src/data/constants.ts`); nothing is simulated in the browser.

## Open it

Double-click **`dist-single/index.html`**: one self-contained file, works offline, no install.
(Not the `index.html` at the top of the folder: that is the developer entry point and shows a blank
page when opened directly.) Use Chrome or Edge; F11 for full screen when presenting.

To host it, upload `dist/` to Netlify, Vercel or GitHub Pages as-is.

## The 4-minute judge tour

Click **Judge tour** (top right) or **Start judge tour** on the home page; it starts at once.
**→** or the arrow in the caption bar moves on, **←** goes back, **Esc** or **✕** exits. 14 stops:

1. **Home**: ₹72 middlemen take per ₹265 order, ~43,000 integrated makers, Hiren’s monthly earnings by day 90; the formula.
2. **Problem**: the ₹265 order (₹138 factory, ₹55 logistics/RTO/fee, ₹9 + ₹18 + ₹45 middlemen).
3. **Categories**: drag the weights; Apparel rises but still waits.
4. **Personas**: three cohorts, one solution, 90-day outcome vs today’s Meesho.
5. **Journey ch 0**: the demand engine finds the gap and computes benchmark B.
6. **Journey ch 4**: cost check (₹132 ↔ ₹160) and the listing bot; a price above B blocks go-live.
7. **Journey ch 5**: who packs it? Self-ship now; the Pack Point once the node passes 40 makers.
8. **Journey ch 7**: Factory Launch Week vs matched control districts.
9. **Journey ch 8**: returns, RTO and fault attribution.
10. **Journey ch 9**: Gate 1 (Invest / Tighten / Stop).
11. **Journey ch 10**: day-33 restock (11/day → reorder at 77 → batch 230) and the one-tap coach fix.
12. **Journey ch 12**: stop the slow SKU, switch to the casserole, add a lunch box.
13. **Economics**: where the buyer’s rupee goes and the Pack Point partner P&L.
14. **Impact**: day-90 scorecards and the bridge from one maker to the deck’s ₹657 Cr.

## Exploring

- **Journey**: drag the timeline or use ‹ › / ← → through day −14 to 90; switch Hiren / Ayesha /
  Sunita; **Focus** enlarges a view; **Without our solution** overlays today’s Meesho on the chart.
  The phones are clickable (listing bot, checkout, one-tap coach fix).
- **Control room**: tabs (demand engine, ledger, Pack Point, launch, coach & KAM, cohort) and a day selector.
- **Economics**: per-order breakdown per party and the Pack Point P&L slider.

## Pages

Home · Problem · Categories · Personas (+ one page per maker) · Journey · Control room · Economics · Impact.

## For developers

```bash
npm install
npm run dev            # local dev server
npm run build          # dist/
npm run build:single   # dist-single/index.html
npm run snapshot       # regenerate the hardcoded data (src/data/snapshot.json) from the engine
npm test               # formula unit tests
npx playwright install chromium && npm run e2e   # link crawler + single-file smoke test
```
