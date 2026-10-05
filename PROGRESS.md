# MVP progress

## M1: shell, accounts, demo clock, state ✅

**Built**
- `#/` role picker: Maker app (large), Meesho ops console, Case notes. The old home page and explainers moved under Case notes (`#/notes`).
- Maker app shell (`src/mvp/MakerShell.tsx`): login with three demo accounts (`#/app`); a 390 px phone frame on desktop with the demo controls and a "What Meesho sees" panel beside it; full-screen with a bottom-sheet clock on mobile; a header with a language toggle; a stage banner; bottom tabs.
- Demo clock: current day (−14 to 90) with a slider, Next day, Jump to next nudge and Reset account (with confirmation).
- Per-account state (`src/mvp/state.ts`): a versioned localStorage key per account, with try/catch and an in-memory fallback.
- Screens: Today and More. `#/ops` shows the existing control room until M5.
- Engine groundwork for later phases: arrivals and returns per day in `simulate.ts`, MVP constants, the nudge engine (`src/engine/nudges.ts`, wired up in M3) and Hindi strings.

**Tests**
- Build OK; unit tests 52/52.
- Crawler: 17 routes, 176 clicks, no errors.
- New `mvp.spec.ts`: separate account state, Next day, reload persistence and reset all pass.
- Single-file smoke test passes.

**Deferred:** onboarding (M2), nudges, Today and Inbox (M3), operating screens (M4). Their entry points stay hidden until then (`src/mvp/ready.ts`).

## M2: onboarding through "Committed" ✅

**Built**
- Entry screen per persona (`#/app/start`):
  - Hiren: demand card (315–455 a week, Simulated).
  - Ayesha: take-home calculator, Meesho vs Amazon (Amazon fees are a team estimate).
  - Sunita: diagnosis (2,400 views → 38 clicks; refusals 31% vs 22%) and "Fix and relist".
- Cost check (`#/app/check`): making cost, optional margin, the pre-filled stack, a pass / near miss / not a fit / no data verdict, and TCS/TDS shown as withheld and claimable.
- Sign-up (`#/app/signup`): seller type, then a simulated GST/Udyam check. A mismatch makes the maker not eligible for Launch Week.
- Listing bot (`#/app/list/:sku/product|quantity|price`):
  - Product: 3–5 photos, recognise → Confirm/Change, before/after (Simulated), editable title/attributes and packed weight.
  - Quantity: demand card with confidence and likely share, editable minimum batch and lead time, first-lot slider down to the minimum run, stock value at cost.
  - Price: margin → list price and take-home, live; band bar; go-live blocked above B with the reason; fees locked at dispatch; go-live checklist.
- Fulfilment (`#/app/list/:sku/fulfilment`): fee at today's node size. Ship-myself is recommended under ₹175 or with no node; otherwise "Pack Point waits; ship yourself meanwhile" until 40 makers.
- Launch (`#/app/launch`): order book (cap B, expected orders, first lot, dates), the commit button, the stock-ready checklist, the live dashboard and the day-30 result card.
- Today shows the setup checklist with "Continue setup".
- Mobile: the demo clock collapses to a pill and the tabs stay pinned.

**Tests**
- Unit tests 52/52; build OK.
- Crawler: 20 routes, 208 clicks.
- New `onboarding.spec.ts`: all three accounts go from login to "Committed" by clicking. Hiren's numbers check out: break-even ₹132, list ₹148, take-home ₹15, first lot 150.
- MVP state test and single-file smoke test pass.

**Deferred:** none for M2.

## M3: nudge engine, Today/Inbox, deep links ✅

**Built**
- `src/engine/nudges.ts`: a pure engine with all 26 types, each with a cause (`source`), priority, due date, expiry, a deep-link CTA, actions and Hindi copy.
- Today: urgent and today items, then updates; live stats (orders today, stock left, next payout).
- Inbox: all or unread, grouped by day. A red dot on the Today tab when anything is urgent. The header bell counts unread active nudges.
- Each target screen shows the nudges that point to it at the top, so the action can be taken there.
- The CTA target screens needed for deep links were built here, ahead of M4:
  - Orders, with a Returns tab and the `ret` highlight
  - Pack Point
  - Products and product detail
  - Coach
  - Earnings
- Ops console (`#/ops`) with a Nudge log tab, synced to the demo clock: "restock_batch fired for Hiren · run-rate 11/day · reorder point 77".

**Tests**
- Unit tests 94/94, including 42 new nudge tests:
  - every type fires on its condition and day;
  - deep links are valid;
  - per-persona rules: Pack Point only for Hiren, Launch Week numbers, prepaid frequency, escalation;
  - clearing and expiry, the jump walk and determinism.
- New e2e `nudges.spec.ts`: Jump to next nudge walks Hiren from day −7 to the end (72 jumps). It opens 19 nudge types' CTAs at their days, then every distinct CTA path; the urgent dot appears on Ayesha's stock-out.
- Crawler: 27 routes, 335 clicks. All e2e tests pass.

**Deferred to M4:** operating-screen polish and per-flow tests.

## M4: operating screens ✅

**Built / polished**
- Orders: Valmo pickup window; per-SKU order cards with dispatch-by and countdown; label placeholder (Simulated); Packed and Handed over, which clear the matching nudges. Pack Point rows show "packed and shipped by the Pack Point".
- Returns: who pays (RTO free when dispatched on time; return fee by weight and zone; swap → claim with unboxing video for self-ship, or caught by weight at the node), grading, the `ret` highlight, and nudges filtered per tab.
- Pack Point: next lot per SKU and its drop window, lots received (sent vs counted), a storage clock per lot (30 days free, then ₹0.29/unit/day; decision at day 60), and the no-node case for Ayesha and Sunita.
- Products: make more / keep / fix / stop with days of cover. A stopped SKU gets a "make this instead" card (or "add this product" for an expansion). The listing bot opens pre-filled, then fulfilment recommends the Pack Point (41 makers, ₹30), then the product page.
- Product detail: price vs band, stock and reorder point, last batch asked, quality vs the type, prepaid offer state.
- Coach: this week's fix (with the Hindi line), re-check date, history with worked / didn't work.
- Earnings: earned (accrued), paid out, cash in stock at cost, days of cover, net cash position with an explanation, weekly payout bars, TCS/TDS credits, per-unit take-home.
- Fixes found in the visual review:
  - payout bars rendered empty;
  - duplicate payout cards;
  - "not listed yet" showed after the demo's auto-commit;
  - expansion copy;
  - re-check dates past day 90;
  - orders row layout on narrow screens.

**Tests**
- New `operate.spec.ts` (8 flows):
  - pack → hand over;
  - "not ready" → urgent deadline → hand over;
  - Pack Point lots and storage;
  - sipper stop → casserole via the listing bot → Pack Point;
  - returns highlight → claim;
  - Sunita's escalation;
  - Ayesha's prepaid offer;
  - earnings lines.
- New mid-story crawl: all three accounts on day 78, 77 routes, 1,016 clicks.
- Both crawls, all e2e tests and 94 unit tests pass.

## M5: ops console and section 6 fixes ✅

**Built**
- `#/ops` tabs: Nudge log · Demand engine · Ledger · Launch Week (new order book and slot allocation across the three makers, district control, Gate 1, fault) · Pack Point node (new inbound and storage queue, fee curve, partner P&L, returns queue) · Coach & escalation (ladder, makers per category manager) · Cohort metrics vs targets (by measurement day, then the Gate 3 decision).
- "As of Day N" follows the selected maker's demo clock, and moving it moves the clock.
- Engine fix: no cash in stock before the commit (pack-later units). Snapshot regenerated.
- New `tests/unit/engine.test.ts` (14 tests) for the section 6 rules, plus a check that the shipped snapshot equals a fresh run.

**Day-90 numbers** (`npx vite-node scripts/day90.ts`)

| | Orders | Earned | Paid out | Stock left (cover) | Counterfactual stock | Gates |
|---|---|---|---|---|---|---|
| Hiren | 1,434 | ₹15,780 | ₹1,02,645 | 332 (11.1 days) | 423 | G1 Invest · G2 Tighten (stick 0.96) · G3 Invest |
| Ayesha | 692 | ₹33,925 | ₹1,35,113 | 155 (17.0 days) | 430 | G1 Invest · G2 Tighten (stick 0.96) · G3 Invest |
| Sunita | 1,005 | ₹11,002 | ₹54,321 | 264 (18.9 days) | 406 | G1 Tighten → rerun Invest · G2 Continue (1.10) · G3 Invest |

Cohort (Hiren and Ayesha's launch, 36 makers):
- price drop 9.0% vs ≥ 8%
- active at day 60: 78% vs ≥ 70%
- active at day 90: 69% vs ≥ 60%
- second lot by day 45: 69% vs ≥ 50%

Sunita's launch (45 makers): 9.7%, 82%, 73%, 53%. Scale bridge: ₹658.8 Cr vs the deck's ₹657 Cr.

**Tests:** 108 unit tests; 20 e2e tests including the new `ops.spec.ts`; both crawls green.
