# Claude Code prompt: turn the prototype into the Meesho Factory MVP

Paste this into Claude Code inside the existing prototype repo. Work phase by phase and **stop after each phase** with a short report (what changed, test results, screenshots of new screens).

---

## 0. What changes and why

The current build is a **judge-facing explainer** (journey with three views, control room, impact pages). We now want an **MVP of the product itself**: the app a manufacturer actually uses, inside Meesho's Supplier app, to go from first message to a growing business.

**The MVP has two surfaces:**

1. **Maker app (primary, phone-first).** Everything a manufacturer sees and taps, including every nudge that tells him **what to make, how much, by when, when to hand parcels to Valmo, and when to send a lot to the Pack Point**. Physical tasks (making the batch, packing, the handover, the drop at the Pack Point) happen off the app; the app only **nudges, confirms and records** them.
2. **Meesho ops console (secondary, desktop).** The internal side that generates those nudges: demand engine, benchmark B, ledger, Launch Week order book, Pack Point node, coach and escalation queue, cohort metrics.

**Keep and reuse:**
- the simulation engine, `formulas.ts`, `constants.ts`, personas, categories, the design system
- the Control Room components (they become the ops console)
- hash routing and the link-crawler test

**Demote:** the explainer pages (problem, category lab, impact, levers, break-it, verify, roadmap, tour) move under a **"Case notes"** menu. Keep them working; don't delete them.

**Non-negotiables (unchanged):**
- No broken links, no console errors.
- Deck palette and type.
- Compliant copy (never "lowest price", "cheapest", "guaranteed", "sale", "Direct from factory", "Verified factory").
- Forecasts say "a forecast, not a guarantee".
- Every number comes from `constants.ts` / `formulas.ts`.
- Anything AI is tagged "Simulated".
- Deterministic: the same seed and the same day always give the same state.

---

## 1. Entry and roles

`#/` becomes a role picker:

| Card | Opens |
|---|---|
| **Maker app** (primary, large) | `#/app` |
| **Meesho ops console** | `#/ops` |
| **Case notes** (small link) | the old explainer pages |

**Maker app login** is a demo account picker with three accounts:

| Account | Persona | Category | Main question |
|---|---|---|---|
| **Hiren Patel**, Shree Ganesh Steelware, Rajkot | Offline Only | Home & Kitchen | "Will it sell? Who packs it?" |
| **Ayesha Siddiqui**, Siddiqui Metal Crafts, Moradabad | Online Elsewhere | Home & Kitchen | "What's my net after fees and RTOs?" |
| **Sunita Das**, Shree Durga Imitation Jewellery, Kolkata | Churned from Meesho | Fashion Accessories | "Will anyone see my listings this time?" |

Each account carries its own state.

**Demo clock** (clearly labelled "Demo controls", collapsible, bottom-right on desktop, a bottom sheet on mobile):
- Current day (Day −14 → Day 90)
- **"Next day"**, **"Jump to next nudge"**, **"Reset account"**
- It advances the simulation and fires the nudges due that day.
- It never appears inside the phone UI.

**State persistence:** save each account's state in `localStorage` (versioned key; wrap every read and write in try/catch; fall back to in-memory). "Reset account" clears it.

**Layout:**
- Desktop: the maker app renders inside a 390×844 phone frame, centred, with the demo clock beside it and an optional "What Meesho sees" side panel (read-only ops data for the current screen).
- Mobile: full-screen.

---

## 2. Maker app: information architecture

**Bottom tabs:** **Today** · **Products** · **Orders** · **Earnings** · **More**

| Route | Screen |
|---|---|
| `#/app/today` | **Today** (the home screen): a task list of active nudges sorted by due time, each with one primary action. Banner for the current stage (e.g. "Factory Launch Week · Day 23 · Live"). |
| `#/app/inbox` | All notifications, filter by type, read/unread |
| `#/app/start` | First-run flow (sections 3.1–3.3) |
| `#/app/list/:sku/product` · `/quantity` · `/price` | Listing bot, 3 screens |
| `#/app/list/:sku/fulfilment` | Ship myself vs Pack Point |
| `#/app/launch` | Launch Week order book, commit slot, stock-ready checklist, launch dashboard, day-30 results |
| `#/app/products` | Product status: make more / keep / fix / stop, with switch suggestions |
| `#/app/products/:sku` | Product detail: stock, days of cover, price vs band, coach history |
| `#/app/orders` | Orders with status, labels, pickup window, dispatch deadline; returns tab |
| `#/app/packpoint` | Lots: send next lot, drop windows, lots received, storage clock (Pack Point SKUs only) |
| `#/app/coach` | This week's fix + history |
| `#/app/earnings` | Payouts (7 days after delivery), take-home, TCS/TDS credits, stock value, days of cover |
| `#/app/more` | Language (English/हिंदी), help, escalation status, account |

**Rules:**
- Every nudge's CTA deep-links to the exact screen and item.
- No nudge leads to a dead end.
- Every screen has a back path.

---

## 3. Maker app: screens

Keep screens simple, large tap targets, one primary action per screen, Hindi/English toggle on every screen (Hindi strings in `i18n/hi.ts`; keep wording plain).

**3.1 Entry: the message link (persona-specific)**

| Persona | First screen |
|---|---|
| Hiren | **Demand card**: product type, ~300–450 orders a week unserved, the price buyers pay, "a forecast, not a guarantee". CTA "Check if it pays (5 min)". |
| Ayesha | **Take-home calculator**: Meesho vs Amazon at the same factory price, fee stack side by side. Amazon fee assumptions live in `constants.ts`, status "Team estimate". |
| Sunita | **Diagnosis of her old listing**: 2,400 views → 38 clicks, main photo the likely reason; refusals 31% vs 22% for the category. CTA "Fix and relist". |

**3.2 Cost check**
- He types making cost; margin is optional.
- The full cost stack is shown pre-filled: packaging, shipping and fixed fee, returns buffer, GST inside the price.
- TCS 0.5% and TDS 0.1% appear as "withheld, claimable".
- Verdict against B: pass / near miss (show what would get him under) / not a fit (suggest a product on the same process) / no data.

**3.3 Sign-up**
- Seller type question.
- GST and Udyam auto-check status (passed / mismatch → "not eligible for Launch Week" with the reason).

**3.4 Listing bot**
1. **Product:** upload 3–5 photos (use bundled sample images); product recognised → Confirm/Change; **before/after image pair** (cluttered → clean background, "Simulated"); title and attributes editable; packed weight pre-filled.
2. **Quantity:** demand card with confidence and likely share; minimum batch and lead time pre-filled (editable); suggested first lot as a slider within the suggested range, down to the minimum run; shows stock value at cost. No cash question.
3. **Price:** margin → list price and take-home live; band bar (break-even ↔ B); a price above B blocks go-live with the reason; fees locked at dispatch; go-live checklist.

**3.5 Fulfilment choice**
- Ship myself vs Pack Point, with the fee per delivered order **at the current node size** (₹44 below 40 makers, ₹30 at 40+).
- Below ₹175 the app recommends ship-myself and explains why.

**3.6 Launch**
- **Order book:** slots per product type, price cap B, expected orders (range), dates (commit by day 7, stock in by day 18, live days 21–25); commit button.
- **Stock-ready checklist:** lot ready (tap), stock linked, price locked.
- **Launch dashboard:** orders today, stock left, next payout date.
- **Day-30 results card:** stick rate, sell-through, price held, decision (Invest / Tighten / Stop), and what it means for him in plain words.

**3.7 Orders (self-ship SKUs)**
- Per order: status, a label PDF placeholder ("Simulated"), dispatch deadline countdown, today's Valmo pickup window.
- Buttons: "Packed", "Handed over".

**3.8 Returns**
- Each return shows what happened and who pays:
  - RTO / refused: no charge when dispatched on time; unit comes back.
  - Customer return: return fee by weight and zone.
  - Swapped item: claim with unboxing video (self-ship) or caught by weight at the node (Pack Point).

**3.9 Pack Point (Pack Point SKUs only)**
- Next lot to send (units, drop window).
- Lots received (counted vs sent, shortfalls).
- Storage clock per lot (days stored, free until day 30, ₹0.29/unit/day after, day-60 decision).

**3.10 Products (make to demand)**
- Each SKU tagged make more / keep / fix / stop, with days of cover.
- A stopped SKU shows the "make this instead" card (open-gap product on the same material and process) → one tap opens the listing bot pre-filled.

**3.11 Coach**
- This week's single fix (cause, the fix, one-tap action, re-check date).
- History of fixes and whether they worked.

**3.12 Earnings**
- Three clearly separate figures: **Earned (accrued)**, **Paid out**, **Cash in stock (at cost)**, plus days of cover.
- **Never show a negative "take-home"**; if needed, show a "Net cash position" with a tooltip.

**3.13 More**
- Escalation status ("A Meesho category manager will call you tomorrow at 11 am").
- Language, help.

---

## 4. Nudge engine (the heart of the MVP)

Create `src/engine/nudges.ts`: a pure function `nudgesFor(account, day, state) → Nudge[]`.

**`Nudge` shape:** `{ id, type, title, body, dueAt?, priority: 'urgent'|'today'|'info', cta: { label, route }, persona, sku?, source }`.

**Behaviour:**
- Nudges appear in **Today** and **Inbox**.
- Urgent nudges show a red dot on the Today tab.
- A nudge clears when its action is recorded or it expires.

**Implement every nudge below**, firing on the day and condition shown (computed by the engine, never hard-coded per day):

| Type | When it fires | Example copy | CTA → route |
|---|---|---|---|
| `make_first_lot` | Slot committed | "Make your first lot: 150 units. Start by 6 Nov to be ready by 18 Nov." | Mark started → `#/app/launch` |
| `stock_in_reminder` | 3 days before stock-in | "Stock-in in 3 days. Is your lot ready?" (Ready / Running late) | `#/app/launch` |
| `send_lot_packpoint` | Pack Point SKU, lot due | "Send your lot to the Rajkot Pack Point: 150 units, drop Thu 10 am–4 pm." | `#/app/packpoint` |
| `lot_received` | After drop | "Lot received: 148 counted and weighed, 2 short. Stock linked." | `#/app/packpoint` |
| `launch_live` | Day 21 | "You're live in Factory Launch Week." | `#/app/launch` |
| `new_order_pack` | Each self-ship order | "New order: pack and keep ready. Label ready." | `#/app/orders` |
| `valmo_pickup` | Daily, if parcels pending | "Valmo pickup today, 4–6 pm: 14 parcels." | `#/app/orders` |
| `dispatch_deadline` | < 24 h left | "2 orders must be handed over by 2 pm tomorrow, or they auto-cancel." (urgent) | `#/app/orders` |
| `pickup_missed` | Pickup not confirmed | "Pickup missed? Reschedule for tomorrow." | `#/app/orders` |
| `return_incoming` | Self-ship return in transit | "1 return arriving tomorrow. Check and grade it." | `#/app/orders?tab=returns` |
| `claim_reminder` | Swapped item, self-ship | "File a claim with your unboxing video." | returns item |
| `return_at_node` | Pack Point return | "Return received at the node: graded A, restocked. Nothing to do." (info) | returns item |
| `day30_result` | Day 30 | "Your first 30 days: Invest. See what it means." | `#/app/launch` |
| `restock_batch` | Days of cover ≤ lead time + safety | "Selling 11 a day. Make your next batch: 230 units, start by 24 Nov to avoid running out on 29 Nov." | `#/app/products/:sku` |
| `send_next_lot` | Pack Point SKU, weekly | "Send next week's lot: 75 units, drop Thu." | `#/app/packpoint` |
| `stock_out` | Stock = 0 | "Out of stock: your listing has left ranked results. The page stays up; restock to come back." (urgent) | product |
| `storage_warning` | Units at day 25 of storage | "45 units stored 25 days; free storage ends in 5 days." | `#/app/packpoint` |
| `storage_decision` | Units at day 60 | "30 units haven't moved in 60 days. Keep, or stop and let them sell down." | product |
| `coach_fix` | Weekly, if a trigger fires | "This week's fix: change your main photo (CTR 1.6% vs 4.2%)." Hindi version. | `#/app/coach` |
| `coach_recheck` | 14 days after a fix | "Your photo fix worked: CTR back to 3.9%." | `#/app/coach` |
| `price_alert` | B moves | "Benchmark moved to ₹155. Your ₹148 still holds." / "Lower your price to keep your launch slot." | product |
| `prepaid_nudge` | Refusals > 75th percentile | "Many COD orders are being refused. Turn on the prepaid offer and show a clearer delivery date." | product |
| `stop_sku` | Slow seller 2+ weeks while the type is steady | "Stop making the 750 ml sipper. 123 units left will sell down." | `#/app/products` |
| `switch_sku` | After a stop | "Make this instead: 1.5 L casserole, 200/week unserved, same steel and press. List it (2 min), then make 100 units by 2 Dec." | listing bot |
| `escalation_call` | Fix failed twice OR 2 nudges ignored | "Our fix didn't work twice. A Meesho category manager will call you tomorrow at 11 am." | `#/app/more` |
| `payout` | 7 days after delivery | "₹14,280 paid today for orders delivered 7 days ago." | `#/app/earnings` |

**Which nudges each persona gets** (the engine decides from the account's SKUs and route; don't hard-code per persona):

| | Hiren | Ayesha | Sunita |
|---|---|---|---|
| Fulfilment | Self-ship for the ₹148 bottle; Pack Point for the ₹265 casserole once the node reaches 40 makers | Self-ship | Self-ship (₹150 is below the Pack Point threshold) |
| Pack Point and storage nudges | ✓ | — | — |
| Launch Week | 2 | 1 | 2 |
| Prepaid nudges | Rare | Frequent | Frequent |
| Escalation | — | — | Fires once (the fix fails twice → plating issue → a new coach rule) |

**Ops console mirror:** for every maker nudge, the ops console shows the system event that caused it ("restock_batch fired for Hiren · run-rate 11/day · reorder point 77").

---

## 5. Meesho ops console (`#/ops`)

Reuse the Control Room components. Show **"As of Day N"** (synced to the demo clock).

**Tabs:**
- **Demand engine:** gap sizing, B table with exclusions
- **Ledger:** one unit throughout, orders/week
- **Launch Week:** order book, slot allocation, matched district control
- **Pack Point node:** makers pooled, fee curve, inbound/storage/returns queue, partner P&L
- **Nudge log:** every nudge fired, by maker, with cause
- **Coach & escalation queue:** the intervention ladder; makers per category manager
- **Cohort metrics vs targets:** stick rate, active at day 30/60/90, second lot by day 45, price drop vs B (cohort ≥ 8%)

---

## 6. Engine and number fixes (carry these into the MVP)

1. **Problem/cost breakdown:** factory ex-works ₹138 + Meesho logistics/RTO/fixed fee ₹55 + distributor ₹9 + wholesaler ₹18 + reseller ₹45 = ₹265 (not ₹193 ex-works).
2. **Nothing before it exists:** before the maker commits stock, cash in stock = 0; no "price vs B" before he lists; remove "your listing" from the B table until it exists.
3. **Ledger in one unit:** orders/week for gap, committed supply and his lot.
4. **Pack Point saving** uses the fee at the current node size; below 40 makers show "waits; ship yourself meanwhile".
5. **Restock sizing:** stock at day 90 ≤ 21 days of cover; each persona ends day 90 with **less** stock than its counterfactual.
6. **Gate 2:** the decision follows the rule shown (stick rate < 1.0 at day 60 → "Tighten" with the reason).
7. **A realistic base run:** Sunita → Tighten at Gate 1, then Invest after the rerun with her listing fix. Cohort metrics clear targets with real margin, not by 0.1 points.
8. **Scale bridge** (Case notes → Impact): simulated 90-day run-rate → SKU expansion via make-to-demand → mature maker (~3,000 units/month across 8–10 SKUs) → × makers → orders × ₹60 → the deck's ₹657 Cr, with every assumption labelled.
9. **Metric labels:** "Target:" only on real targets; "makers per category manager" (not "per KAM case"); remove "RTOs avoided" unless computed from Pack Point orders.

---

## 7. Design

**Tokens** (as before):

| Token | Hex |
|---|---|
| plum | #5C1049 |
| magenta | #9F2089 |
| pink | #F43397 |
| orange | #FE9C01 |
| cream | #FFF4E5 |
| blush | #FCE4F1 |
| ink | #2B1026 |

- Poppins + the serif display font.
- **Maker app** should feel like a real Meesho Supplier app screen: white cards on light grey/cream, magenta primary buttons, orange for "do this now" tasks, status colours (green / amber / red) only for status.
- **Minimum text size:** 14 px in the app, 12 px for captions.
- **Nudge cards:** icon, title, one line of detail, due time, one CTA. Urgent ones get a red left border.
- **Tags:** "Simulated" on AI and labels; "Partner-run" on the Pack Point; "Existing Meesho" on Valmo, payouts and the boost.
- **Projector check:** at 1366×768 the phone frame and the demo clock must both be fully visible without scrolling.

---

## 8. Phases (stop after each)

### Phase M1: shell and state (≈ 40 min)
- Role picker; maker login with 3 accounts; bottom tabs; demo clock; localStorage state with reset; all routes stubbed with real titles; Case notes menu for the old pages.
- Extend the link crawler to all new routes.

**Acceptance:** crawler green; switching accounts keeps separate state; reset works.

### Phase M2: onboarding screens (≈ 60 min)
- Entry screens per persona, cost check, sign-up, listing bot (3 screens, before/after images, live band check, go-live blocking above B), fulfilment choice, order book, commit, stock-ready checklist.

**Acceptance:** each account can go from the link to "Committed" without dead ends; numbers match `formulas.ts` (break-even ₹132, list ₹148, take-home ₹15, lot 150 for Hiren).

### Phase M3: nudge engine + Today/Inbox (≈ 60 min)
- `nudges.ts` with all 26 types, unit-tested (each fires on the right condition and day for each persona, and clears when actioned).
- Today and Inbox screens; deep links; urgent badge; the ops console nudge log.

**Acceptance:** "Jump to next nudge" walks Hiren from day −7 to day 90, and every nudge's CTA opens the right screen.

### Phase M4: operating screens (≈ 60 min)
- Orders (pack / label / pickup / deadline), returns (all 3 cases), Pack Point lots and storage clock, launch dashboard, day-30 results, products / make to demand with switch → listing bot, coach with re-check, price alert, earnings (earned / paid / stock), escalation status.

**Acceptance:**
- Hiren's casserole shows Pack Point nudges and the bottle shows self-ship nudges.
- Sunita's escalation fires once.
- Ayesha gets prepaid nudges.

### Phase M5: ops console + engine fixes (≈ 45 min)
- The ops console tabs from section 5, synced to the demo clock.
- All fixes in section 6.

**Acceptance:** print the day-90 numbers for all three accounts, including stock vs counterfactual and the cohort metrics.

### Phase M6: QA and ship (≈ 30 min)
- Link crawler across everything; copy audit (forbidden words); 1366×768 and 390×844 checks; Hindi toggle on every maker screen; no console errors.
- Build both outputs: `dist/` (Vercel) and the single-file `index.html`.
- README with a **3-minute MVP demo script**: log in as Hiren → link → cost check → bot → commit → jump through nudges (make lot, pickup, launch live, return, day 30, restock, coach, switch) → earnings → ops console nudge log; then 30 seconds each on Ayesha and Sunita.

**Acceptance:** all tests green; deployed URL works from a fresh browser.
