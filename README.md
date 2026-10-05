# Meesho C2M: factories to buyers (Team RK, IIT Kharagpur)

A clickable, fully offline prototype showing how an integrated manufacturer is found, onboarded,
launched and grown on Meesho over 90 days, and what changes for the **maker**, the **buyer** and
**Meesho**, number by number. All data is synthetic; every number traces to `src/data/constants.ts`
or a formula in `src/engine/formulas.ts`.

## Open it

**No install (recommended for judging):** double-click `dist-single/index.html`. It is one
self-contained file (fonts and code inlined), works offline, and uses hash routing
(`index.html#/journey/hiren`), so every page works from disk.

**Static host:** upload `dist/` to Netlify, Vercel or GitHub Pages as-is (relative paths, hash routes).

**From source** (Node 20+):

```bash
npm install
npm run dev            # local dev server
npm run build          # dist/
npm run build:single   # dist-single/index.html
npm test               # formula + engine-determinism unit tests
npx playwright install chromium && npm run e2e   # link crawler and page checks
npm run report:phase1  # gate results, day-33 restock, cohort price drop (console)
```

## The 4-minute demo

Click **Judge tour** (top right) → **Start the tour**, then use **→** to advance (← back, Esc exits).
13 stops:

1. **Landing**: the formula *makers × active at day 30 × orders per maker × price drop per order × retained at day 90*.
2. **Problem**: the ₹265 order (middlemen take ₹72) and where each PS question is answered.
3. **Category Lab**: drag the weights; Apparel rises but still waits (fails the buyer tests).
4. **Personas**: three cohorts, one engine, 90-day outcome vs today's Meesho.
5. **Journey ch 0**: the demand engine finds the gap and computes benchmark B.
6. **Journey ch 2**: cost check, break-even ₹132 ↔ B ₹160.
7. **Journey ch 4**: listing bot; edit the margin, a price above B blocks go-live.
8. **Journey ch 7**: Factory Launch Week, launch vs control districts.
9. **Journey ch 9**: Gate 1 (Invest / Tighten / Stop), rule fixed in advance.
10. **Journey ch 10**: day-33 restock (11/day → reorder at 77 → batch 230) and the one-tap coach fix.
11. **Journey ch 12**: stop the slow SKU, switch to the ₹265 casserole via the Pack Point.
12. **Break-it lab**: five scenarios, each with the guardrail that fired.
13. **Impact**: day-90 scorecards, the formula with real values, ×620 makers and the 3,050 scale target.

**Cluster Pack Point:** journey chapters 5–8 (fee curve, inbound weigh-in, pick/pack/QC queue, fault attribution), Control room → Pack Point tab (flow, A/B/C grading, dwell, slow stock, who uses the node), and Economics (partner P&L slider by makers pooled, per-order breakdown, cash view).

**Presenting tips:** on the journey, use **Focus** on any view to enlarge it for the projector; tick
**Without our solution** to overlay the counterfactual on the chart; turn on **Verify** (header) and
click any underlined number to see its formula, inputs, source and status.

## What's synthetic

- The three makers (Hiren, Ayesha, Sunita), their SKUs, costs beyond the deck's worked example,
  buyers, districts, outreach lists and the 30–50-maker cohorts.
- Every order, return, RTO, payout and gate result: produced by a seeded simulation
  (`src/engine/simulate.ts`). Same seed → same story; change it under ⚙ Settings.
- "AI" steps (demand engine, listing bot, coach) are simulations and carry a **Simulated** tag.
- Forecasts are forecasts, not guarantees.

## Source / status legend (Verify mode and `#/verify`)

| Status | Meaning |
|---|---|
| **Meesho filing** | From Meesho's filing (orders, contribution per order, COD mix, AOV) |
| **Public policy (seller guides)** | Public Meesho seller guides / government notifications (commission, payout cycle, TCS/TDS, GST) |
| **Mentor input** | From our Meesho mentor (dispatch SLA, boost taper, swap rule, Valmo scope) |
| **Team model** | Our own model or design rule (Pack Point costs, gates, targets) |
| **Team estimate** | An estimate to confirm in the pilot (simulation assumptions, Amazon fees, N for benchmark B) |
| **Synthetic** | Generated persona / scenario data |

`#/verify` lists every constant with its source and status, plus a **Meesho policy checks** table.

## Map of the code

```
src/data/constants.ts     every number, with value / unit / label / source / status
src/engine/formulas.ts    every derived number (pure, unit-tested)
src/engine/simulate.ts    day −14 → 90 simulation; scenarios; counterfactual
src/data/                 personas, categories, levers, roadmap, generators
src/journey/              the 14 chapters: maker phone, control room, buyer phone
src/views/                one file per page
```
