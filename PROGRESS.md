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
