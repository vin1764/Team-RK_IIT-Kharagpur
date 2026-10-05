# Meesho Factory MVP: factories selling straight to buyers (Team RK, IIT Kharagpur)

A working MVP with two surfaces:

- **Maker app** (phone-first, the product). Three demo makers run their first 90 days with a demo clock: demand, cost check, listing bot, Launch Week, orders, returns, Pack Point, coach and earnings, with a **nudge** for every next step.
- **Meesho ops console** (desktop). What Meesho sees, synced to the demo clock: every nudge and its cause, the demand engine, the ledger, Launch Week, the Pack Point node, the coach and escalation queue, and cohort metrics vs targets.

The old explainer pages (Problem, Categories, 90-day journeys, Economics, Impact) are under **Case notes**.

All data is synthetic and deterministic. The 90-day runs are precomputed (`src/data/snapshot.json`), every number comes from `src/data/constants.ts`, and every calculation from `src/engine/formulas.ts`. Each maker account's progress is saved in the browser (localStorage, versioned, with a memory fallback). **Reset account** in Demo controls starts it again.

## Open it

- **Offline:** double-click `dist-single/index.html` (one self-contained file). Use Chrome or Edge.
- **Hosted:** deploy `dist/` (see Vercel below).
- `#/` is the role picker: **Maker app** → `#/app`, **Meesho ops console** → `#/ops`, **Case notes** → `#/notes`.

## 3-minute MVP demo script

Use a 1366×768 or larger screen. The phone and **Demo controls** sit side by side. Start from **Reset account** if the account was used before.

**Hiren Patel** (offline steel maker, Rajkot: "Will it sell? Who packs it?"), about 2 minutes:

1. `#/` → **Maker app** → **Hiren Patel**. Today shows the setup checklist on day −14. Tap **Continue setup**.
2. **Link / demand card:** 315–455 bottles a week unserved. Tap **Check if it pays (5 min)**.
3. **Cost check:** making cost ₹80 → break-even **₹132**, list price **₹148** under the cap ₹160, take-home **₹15**, verdict "It pays". TCS/TDS are shown as withheld and claimable.
4. **Sign up:** choose "I make it" (choosing wholesaler shows the Udyam mismatch). Then the **listing bot**:
   - Product: add 3 photos, Confirm, see before → after.
   - Quantity: first lot **150**.
   - Price: try a higher margin to see go-live blocked above B.
   - Who packs it: ship myself (₹148 < ₹175; Rajkot node at 34 makers).
   - Repeat for the sipper.
5. **Launch:** order book (commit by 7 Nov, stock in 18 Nov, live 21–25 Nov). **Commit my slot** → "Committed".
6. Press **Next nudge** repeatedly and open each card's button:
   - day 7: make the first lot (150 + 100);
   - day 15: stock-in reminder;
   - day 21: live in Launch Week 2, plus orders → **Orders**, Packed → Handed over, Valmo pickup 4–6 pm;
   - first **return** and **claim** (returns tab highlights the item);
   - day 30: **Invest**;
   - day 33: **"Selling 11 a day. Make your next batch: 230 units"**;
   - day 38: **coach** photo fix (one tap; worked by day 52);
   - day 52: price alert;
   - day 64: **stop the sipper → make the casserole instead** (listing bot pre-filled → Pack Point recommended at 41 makers, ₹30);
   - then Pack Point lots and drops.
7. **Earnings:** earned (accrued) vs paid out vs cash in stock vs days of cover, plus net cash with its explanation.
8. **Ops console** (top bar): Nudge log, "restock_batch fired for Hiren · run-rate 11/day · reorder point 77". Click through Launch Week, Pack Point node and Cohort metrics. The day follows Hiren's clock.

**Ayesha Siddiqui** (online elsewhere, Moradabad: "What's my net after fees and RTOs?"), 30 seconds: **Switch account** → Ayesha. The first screen is the take-home calculator (Meesho ₹349 vs Amazon ₹399). Jump to day 21 and on: **prepaid nudges** (COD refusals above the 75th percentile) → product screen → **Turn on prepaid offer**. There's also a stock-out (red dot on Today).

**Sunita Das** (churned, Kolkata: "Will anyone see my listings this time?"), 30 seconds: the first screen is the diagnosis (2,400 views → 38 clicks; refusals 31% vs 22%) → **Fix and relist**. Jump forward:
- day 30: **Tighten** (one fix, rerun);
- the coach fixes fail twice → **escalation**: "A Meesho category manager will call you tomorrow at 11 am" (More → escalation status);
- the rerun → **Invest**.

## Run locally

```bash
npm install
npm run dev              # http://localhost:5173/#/
npm run build            # dist/ (for Vercel / any static host)
npm run build:single     # dist-single/index.html (offline, one file)
npm test                 # unit tests: formulas, nudge engine (26 types), section 6 engine checks
npx playwright install chromium
npm run e2e              # link crawlers, onboarding, nudges, operating flows, ops console, Hindi, single-file smoke
npm run snapshot         # regenerate src/data/snapshot.json after engine changes
npx vite-node scripts/day90.ts          # day-90 numbers per maker
npx vite-node scripts/nudge-report.ts hiren   # every nudge Hiren gets, by day
```

## Deploy to Vercel

Hash routing works on any static host; no rewrites are needed. `vercel.json` sets the build.

```bash
npm i -g vercel
vercel login
vercel --prod            # framework: Vite · build: npm run build · output: dist
```

Or import the GitHub repo in the Vercel dashboard (Framework preset **Vite**, build `npm run build`, output `dist`).

## Where things are

- `src/mvp/`: maker app (shell, demo clock, per-account state, screens)
- `src/engine/nudges.ts`: the nudge engine
- `src/ops/`: ops console panels
- `src/engine/simulate.ts`, `src/engine/formulas.ts`, `src/data/constants.ts`: engine, formulas, numbers
- `MVP.md`: the spec; `PROGRESS.md`: build log per phase; `ASSUMPTIONS.md`: decisions taken where the spec was unclear
