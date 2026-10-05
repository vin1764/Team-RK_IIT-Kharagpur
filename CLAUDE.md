# CLAUDE.md: Meesho C2M end-to-end prototype (Team RK, IIT Kharagpur)

Project instructions for Claude Code. Read this whole file before writing any code. Build **phase by phase** (section 12). **Stop at the end of every phase** and report what was built, the test results and the phase checklist, then wait for "next phase".

Working rules for this repo:
- Never add a runtime dependency that isn't listed in section 11 without asking first.
- Never hard-code a number in a component: values live in `src/data/constants.ts`, calculations in `src/engine/formulas.ts`.
- Run `npm test` and `npm run e2e` before reporting a phase as done.
- Keep the copy rules in section 0 (no forbidden claims) in every file you touch.

---

## 0. Your role and the goal

You are a senior product engineer and product designer building a **clickable, fully working prototype** for a case competition. The audience is **Meesho judges at PM2 level**: product managers who will judge product thinking, trade-offs, metrics, experiment design, feasibility and unit economics, not just visuals.

**The prototype must show, with synthetic data, how a manufacturer:**
- is found, onboarded and listed on Meesho;
- launches, gets orders, handles returns and restocks;
- grows over 90 days;

and what changes for the **maker, the buyer and Meesho**, step by step and number by number.

**It must also show:**
- How the same engines handle **different categories**, including the ones we deliberately don't launch, and why.
- **Three manufacturer personas** (Offline Only, Online Elsewhere, Churned from Meesho), each with their own problem and their own path through the solution.

### Non-negotiables

1. **Nothing breaks.** Every button, link, tab and route works. No dead ends, no "coming soon", no console errors. Every page has a way back and a way forward. Use hash routing so it works on any static host and when opened from a file.
2. **One source of truth for numbers.**
   - Every number comes from `src/data/constants.ts` or is computed by a function in `src/engine/formulas.ts`.
   - No hard-coded numbers in components.
   - Every displayed number can show its formula and source on click (see "Verify mode").
3. **Matches our deck's design** (palette and type in section 4).
4. **Compliance language** (Meesho was fined by the CCPA for misleading claims):
   - Never write "lowest price", "cheapest", "best price", "guaranteed", "sale", "Direct from factory" or "Verified factory" in any buyer-facing UI.
   - Allowed framing: "Factory Launch Week", "made by the factory", "priced at or below today's typical price".
   - Forecasts always say "a forecast, not a guarantee".
5. **Honest simulation.**
   - Anything "AI" is clearly a simulation (a small "Simulated" tag); never fake a live API.
   - Synthetic data is labelled synthetic.
   - Deterministic: the same seed and settings always give the same story.
6. **Runs offline.** No backend, no API keys, no external calls at runtime. All images local (generated SVG/illustrations, or simple placeholders that look intentional).

---

## 1. The problem statement (verbatim intent)

> "Design a strategy to meaningfully grow Meesho's C2M seller base and their long-term contribution to price competitiveness."

**Two connected problems:**
1. Large manufacturers don't come onto B2C (built for bulk, made-to-order, no returns; B2C means new operations, inventory risk and a real cost of failure).
2. Those who onboard don't stay (weak early orders, conviction erodes).

**Stated challenges:**
- Operational hassle (single-order packing, reverse logistics)
- Inventory risk
- Unproven demand ("will there be enough scale?")
- Weak early scale-up (small share of orders in the first 30 days)

**The prototype must visibly answer the PS's four questions** (put a persistent "Answers the PS" chip on the relevant screens):
- **Q1** Which segments and categories have a genuine, defensible price advantage, and which don't despite scale? → Category Lab + Type/Turnover filter
- **Q2** What stops reluctant makers, and what changes their calculus? → Personas + Onboarding
- **Q3** What makes early scale-up sustainable without subsidies or handholding? → Launch Week + Growth Loop + makers-per-manager
- **Q4** What should Meesho measure, and when should it intervene? → Control Room metrics + intervention ladder + gates

**Detailed-deck judging criteria to design for:** quality of research, depth of analysis, innovativeness, 10x and long-term thinking, feasibility of implementation, presentation.

**Extra things PM2 judges look for** (build each in): a clear north-star metric and counter-metrics; experiment design with a control group; decision rules fixed in advance; unit economics for every party; what we reuse from Meesho vs build new; edge cases and abuse; rollout and kill criteria; the status-quo counterfactual.

---

## 2. Our solution (what the prototype demonstrates)

### The organising formula (shown on the landing page and lit up during the journey)

**C2M price contribution = makers onboarded × share active at day 30 × orders per maker × price drop per order × share retained at day 90**

| Term | Owner |
|---|---|
| Makers onboarded | ① Factory Onboarding |
| Share active at day 30 | ② Factory Launch Week |
| Orders per maker | ② Launch Week + ③ Growth Loop |
| Price drop per order | Price Integrity Layer (supporting engine) |
| Share retained at day 90 | ③ Growth Loop |
| All five terms | Fuelled by the Demand Intelligence Engine (supporting engine) |

### Supporting engine A: Demand Intelligence Engine

- **Reads** data Meesho already logs: searches, impressions, clicks, orders, delivered orders, returns with reasons, COD refusals, stock status, makers' committed lots.
- **Four steps:** Analyse the data → Diagnose the metric → Size the gap → Suggest action (hand-off to a lever).
- **Product type** = category + material + size/capacity + type (e.g. "1 L steel bottle").
- **Formulas:**
  - `openGap = unservedDemand − committedSupply`
  - `expectedDailyPerSku = openGap/7 × likelyShare`
  - `likelyShare` = median over past launches of (first-28-day orders ÷ open gap at launch), adjusted for price position and number of entrants; shown as a range (25th–75th percentile); Low confidence when history is thin.
- **Conditions and hand-offs:**

  | Condition | Diagnosis | Sized as | Hand-off |
  |---|---|---|---|
  | High search, low search-to-click, few listings | Supply gap | Unserved orders | Demand teaser + first-lot sizing |
  | High search, many stock-outs | Under-supplied | Orders lost = stock-out days × daily run-rate | Restock sooner |
  | High orders, many product-reason returns | Product gap | Delivered × (return rate − category median) | Fix the product |
  | Clicks fine, low conversion, median price above a maker's break-even | Price gap | Clicks × (median conversion − current) | List lower, within cost |
  | Top-5 share high and stable | Dominated | — | Don't send makers |
  | Committed supply ≥ 90% of gap | Crowded | — | Switch suggestions |

- **Committed-supply ledger:** commitments subtract from the gap every seller sees; expire if not live within lead time + buffer; capped at declared capacity; new listings in the last 7 days count as provisional supply.
- **Access rules:** the same market view for every seller (manufacturer, wholesaler, reseller); SKU-level view only for its own seller; free in the pilot. Makers win on **speed**, not access.

### Supporting engine B: Price Integrity Layer

- **Benchmark B** = 25th-percentile delivered price buyers paid, per unit, same spec, among listings with ≥ N delivered orders and above the quality floor, the maker's own orders excluded, 28-day window, sale days excluded, net of platform-funded coupons.
- **Three checks:**
  1. **Price band:** `breakEven ≤ price ≤ B`, at onboarding (cost check) and listing.
  2. **Like-for-like:** identical specs, per unit.
  3. **Auto price-hold:** stay ≤ B as B moves; breach → launch slot removed → visibility cut → review.
- **Gaming and what catches it:**
  - Thinner material → "not as described" returns > 1.5× category norm + sampled test buys.
  - Price raised after reviews → auto price-hold.
  - Rival dumps stock to drag B down → percentile + minimum orders + per-seller weight cap.
- **North star:** `priceDropDelivered = Σ(B − price) × orders ÷ Σ orders`; target in constants.
- **C2M is a filter, not a label:** seller type = manufacturer + GST/Udyam records agree + price compared with B. No buyer-facing badge.

### ① Factory Onboarding

1. **Find:** Meesho exit records (churned), IndiaMART manufacturer profiles, marketplace storefronts (online elsewhere), cluster-association lists (offline).
2. **Pitch:** demand teaser naming the product type and its gap + a 5-minute cost-check link. WhatsApp **only after opt-in** (first contact via IndiaMART enquiry or email). Message differs by cohort.
3. **Sign-up and auto checks:** one question (manufacturer / wholesaler / reseller); GST "nature of business" and Udyam activity type checked automatically; mismatch → not launch-eligible.
4. **Cost check:** the maker types making cost (and margin); everything else is pre-filled from the product type; verdict against B (pass / near miss with levers / not a fit with an alternative product / no data).
5. **AI listing bot, three screens:**
   - **Product:** photos → product type recognised (maker confirms) → cleaned images, title from top searches, attributes pre-filled.
   - **Quantity:** demand card + confidence, likely share, minimum run and lead time pre-filled, suggested first lot ≈ 14 days of expected sales in units (picked within the suggested range, down to the minimum run; no cash question).
   - **Price:** making cost + margin → packaging, shipping and fixed fee, returns buffer, GST filled in → list price, take-home, band check, go-live checklist; **fees locked at dispatch**.
6. **Cluster Pack Point** (optional, recommended only above the price threshold):
   - Shared micro-warehouse run by a 3PL partner: ~40 makers, ~6,000 orders/month, ~1,200 sq ft, 4 staff.
   - Flow: one bulk lot a week → inbound (counted, weighed) → store → pick/pack/QC (photo + weight vs listing) → manifest → Valmo → buyer.
   - Returns go to the node, never the factory, and are weighed against dispatch and graded A/B/C.
   - Fee per delivered order by makers pooled: 20 → ₹44, 40 → ₹30, 60 → ₹26, 80 → ₹23 (₹24.9 per order handled ÷ (1 − RTO)).
   - Storage free days 0–30, then ₹0.29/unit/day; slow stock decided by day 60.
   - Self-ship always available.

### ② Factory Launch Week

- **What it is:** 30–50 makers go live together for 5 days (days 21–25) from a published **order book**: slots per product type, price cap B, expected orders with confidence, Pack Point fee, dates (commit by day 7, stock in by day 18, live days 21–25). Oversubscribed slot → the lower price wins.
- **Eligibility by rule:** manufacturer, records agree, price in band, stock ready.
- **Placement and quality:** launch section on home and deals pages (no countdowns, no strike-throughs); slots capped per product type; launch ratings down-weighted; quality judged on returns.
- **Measurement:** district-level **control** (some districts don't see the launch section).
- **Week by week:**
  - W1: dates and order book published; makers commit.
  - W2: production; bot builds catalogues; launch promoted.
  - W3: listings checked (price locked, stock linked); live days 21–25.
  - W4: deliveries, returns, early reviews; reorders on the post-launch rate; day-30 decision.
- **Stick rate (north star):** orders per launched SKU per day, days 26–30 ÷ median orders of an established SKU in the same product type, same days.
- **Day-30 rule (fixed in advance):**
  - **Invest** if stick rate ≥ 0.5 AND lift ≥ 1.5× AND sell-through ≥ 60% AND prices held.
  - **Tighten** if lift is positive but < 1.5×, or stick rate < 0.5, or durability is short → adjust B or eligibility, rerun once.
  - **Stop** if there's no lift or prices didn't hold.
- **After the week (nothing new built for ranking):** Meesho's existing onboarding boost continues 3–6 months; launch orders build a listing-level quality score; once it matches a pricier equivalent, Meesho's existing cheaper-equivalent swap gives the listing that slot.
- **Cadence:** monthly, rotating product types. Launch 1: online-elsewhere + churned makers. Launch 2 onward: offline makers via the Pack Point.

### ③ Make-to-Demand Growth Loop (days 31–90)

- **Restock loop:**
  - `runRate` = last 7 days ÷ 7, trend-adjusted on 28 days
  - `reorderPoint = runRate × (leadTime + safetyDays)`
  - `nextBatch ≈ runRate × 21`, never below the minimum run, capped by the open gap
  - Zero stock → out of ranked slots, page stays up with "notify me"
- **SKU health coach:** weekly; one cause → one fix → one Hindi nudge → one tap.

  | Trigger | Condition | Fix |
  |---|---|---|
  | Weak listing | Impressions normal, CTR < 25th percentile | Fix main image/title |
  | Price problem | Conversion < 25th percentile and price > matched median | Price check vs B |
  | Trust/spec problem | Clicks fine, conversion low, price competitive | Scale photo, material close-up |
  | Product fix | Returns > 75th percentile, product reasons | Fix on the next batch |
  | Listing fix | Returns > 75th percentile, expectation reasons | Fix photos and description |
  | Refusals high | Refusal rate > 75th percentile | Prepaid nudge, clearer delivery date |
  | Slow seller | Sell-through < 25th percentile for 2+ weeks while the type is steady | Stop, with "what to make instead" |

- **RTO rate per SKU:** actual return and refusal rates feed the cost stack and the coach.
- **Make to demand:** make more / keep / fix / stop / **switch** (open-gap product types that use the same material and process). Makers switch products, not platforms.
- **Intervention ladder (answers PS Q4):**
  1. Auto metric watch
  2. Coach nudge
  3. One-tap fix
  4. Re-check after 14 days
  5. **Meesho KAM only if a fix fails twice, or two nudges are ignored** → the KAM finds the cause and turns it into a new coach rule

  Makers per manager is tracked and should rise with every launch.

### Gates (lever filter)

| Gate | Test |
|---|---|
| G1 Subsidy-free | No per-order cost once built (Meesho keeps ~₹8.09 per order) |
| G2 Scalable | Works for hundreds of factories with no one assigned to each |
| G3 Price-reducing | Directly lowers the buyer's price |
| G4 Durable | The saving survives price rises, stock-outs and spec swaps |

- Gates don't average: one "no" eliminates a lever.
- **Enabler exception:** a lever that fails only G3 is kept when tied to a lever that passes all four.
- 39 levers considered → 12 kept, 6 merged, 1 deferred, 20 dropped (data in `src/data/levers.ts`).
- 30-day quick win: Factory Launch Week.

---

## 3. Verified facts and constants (put all of these in `src/data/constants.ts` with a `source` and `status` field)

Use exactly these values. Each constant is an object: `{ value, unit, label, source, status: "Meesho filing" | "Public policy (seller guides)" | "Mentor input" | "Team model" | "Team estimate" | "Synthetic" }`. Verify mode (section 7) displays `source` and `status`.

### Meesho platform and policy

| Constant | Value | Status / source |
|---|---|---|
| Commission | 0% | Public: Meesho supplier portal |
| Shipping | Charged by packed-weight slab and delivery zone, deducted from settlement; sellers can't edit it | Public seller guides |
| GST on logistics fees | 18% | Public seller guides |
| Payment cycle | 7 days after delivery, prepaid and COD | Public seller guides; footnote "confirm on Supplier Panel" |
| Buyer return window | 7 days after delivery | Public seller guides |
| RTO (buyer refuses or unreachable) | No reverse shipping charged to the seller when dispatched on time | Mentor input + public seller guides |
| Customer return | Seller pays a return shipping fee by weight and zone | Public seller guides |
| Claims for swapped/damaged returns | Need unboxing evidence; our calls say a claim recovers about half | Public + team calls |
| Dispatch SLA | 24–48 h or auto-cancel; no pre-orders | Mentor input; public guides say 2–3 days, so show "24–48 h (Meesho mentor)" |
| Catalogue go-live | Within ~72 h of upload | Public seller guides |
| Onboarding visibility boost | Tapers over 3–6 months | Mentor input |
| Cheaper-equivalent swap | Into a ranked slot if quality score ≥ the pricier listing's; quality score = share of 1–2★ ratings; unrated listings inherit the seller-level score | Mentor input |
| Valmo | Pickup and delivery only, no storage | Mentor input |
| Demand data | Must be open to all sellers | Mentor input |
| Volume guarantees | None allowed | Mentor input |
| Pricing preference | Sellers prefer per-order fees to subscriptions | Mentor input |
| GST TCS (s.52) | 0.5% since 10 Jul 2024 | Govt notification; withheld, claimable credit, not a cost |
| Income-tax TDS (s.194-O) | 0.1% since 1 Oct 2024 | Finance Act 2024; withheld, claimable |
| GST, steel kitchenware / imitation jewellery / mass footwear | 5% since 22 Sep 2025 (GST rate rationalisation) | PIB factsheet |
| Placed orders FY25 | 183.4 Cr | Meesho filing |
| Contribution per order | ₹8.09 | Meesho filing |
| Charged to seller per order | ₹51.17 avg vs ₹43.1 attributable cost | Meesho filing |
| COD share of shipped orders | 76.95%; COD success 77.70%; prepaid success 97.28% → blended RTO 17.8% | Meesho filing (derived) |
| AOV | ₹265 (FY26 results) / ₹274.27 (FY25 filing); use ₹265 | Meesho filing |
| Forward / reverse cost of a failed order | ₹50 / ₹120 → ₹170 per RTO | Team estimate from filing |
| Orders of contribution per avoided RTO | 21 (₹170 ÷ ₹8.09) | Derived |

### Market and categories (team research)

| Constant | Value | Status |
|---|---|---|
| Maker funnel | 4.72 Cr MSMEs → 4,91,064 small → ~1,52,000 manufacturing (31%) → ~1,14,000 in ₹5–25 Cr (TAM) → ~66,000 in 4 launch categories → ~43,000 integrated makers (SAM) | Team model |
| Order mix FY25 | Apparel 36.17%; Home, kitchen & furnishing 17.24%; Footwear + accessories 16.78% (split 40/60 → footwear ~6.8%, accessories ~10%); Kids & baby 10.48%; BPC 9.98%; Others 9.35% | Meesho filing + team split |
| Year-one exposure | 39.8% → 73 Cr orders; steady state 81 Cr; with apparel 147 Cr | Derived |
| Middleman margin | ≈ 52% on top of ex-works: ₹150 → ₹33, ₹265 → ₹72 (₹9 distributor + ₹18 wholesaler + ₹45 reseller), ₹360 → ₹105 | Team model |
| Saving per ₹265 order | Self-ship: ₹72 − ₹12 own packing/returns = ₹60 (23%). Pack Point: ₹72 − ₹30 = ₹42 (16%), worth it only above `PACK_POINT_MIN_PRICE = 175` | Team model |
| Maker ramp, year one (single value) | 120 → 320 → 620 | Team plan (don't show 1,020 anywhere) |
| Makers needed at 15% conversion | ~3,050 (shown as "scale target", not year one) | Derived |

### Pack Point model (Rajkot)

- 150 orders/maker/month; 26 working days; 50 units on hand per maker; 3 units/sq ft; 500 sq ft fixed area; rent ₹15/sq ft.
- Staff: packer ₹14,000, handler ₹14,000, supervisor ₹22,000; 180 orders/packer/day.
- Consumables ₹5/order; equipment ₹2.5 L over 36 months; utilities ₹8,000; partner margin 18%.
- **Outputs:** cost per order ₹30.8 / ₹21.1 / ₹17.8 / ₹16.2 at 20/40/60/80 makers; fee per delivered order ₹44 / ₹30 / ₹26 / ₹23.
- Storage ₹0.29/unit/day after day 30.
- Status: Team model, cross-checked with Shiprocket's published ₹24 per order.

### Targets (all "starting values, tuned in the pilot")

| Target | Value |
|---|---|
| Contact → live | ≤ 14 days |
| Sign-up → live conversion | ≥ 50% |
| Health check first pass | ≥ 80% |
| Forecast attainment | ≥ 60% at day 14; ≥ 80% at day 30 |
| Stick rate | ≥ 0.5 at day 30; ≥ 1.0 at day 60 |
| Demand lift | ≥ 1.5× |
| Sell-through | ≥ 60% |
| Prices held | ≥ 95% |
| "Not as described" share of returns | < 2% |
| Makers active | ≥ 70% at day 60; ≥ 60% at day 90 |
| Second lot by day 45 | ≥ 50% |
| Fix success (back in band within 14 days) | ≥ 50% |
| Nudges acted on | ≥ 40% |
| Stock-outs per listing per month | ≤ 1 |
| Pack Point fee | ≤ ₹30 at ≥ 40 makers; dwell ≤ 45 days |
| `PRICE_DROP_TARGET_PCT_OF_B` | 8, measured at **cohort** level |

**Consistency rule:** the cohort average must clear 8%. The synthetic cohort makers' prices must be generated so that the average is ≥ 8% below B, while individual makers vary. The hero sits at 7.5%; show that honestly in the UI.

---

## 4. Design system (match the deck)

**Palette** (Tailwind theme tokens):

| Token | Hex |
|---|---|
| `plum` | #5C1049 (headers, primary panels) |
| `plum-deep` | #4A0D3B |
| `magenta` | #9F2089 (bot / system actions, links) |
| `pink` | #F43397 (accent) |
| `orange` | #FE9C01 (CTA, maker actions, highlights) |
| `orange-soft` | #FFE3B8 |
| `cream` | #FFF4E5 (page background panels) |
| `blush` | #FCE4F1 (cards) |
| `ink` | #2B1026 (text) |
| `grey` | #7A4E70 (secondary text) |
| `line` | #F0C9E2 (borders) |
| `good` | #1E9E5A |
| `warn` | #E8A317 |
| `bad` | #D64545 |

**Type:**
- Poppins (body, UI) and Cardo or Playfair Display (display headings, standing in for the deck's serif), bundled locally via `@fontsource`.
- Headings follow the deck style: plum rounded "tab" title bars, orange pills for stage labels, dashed plum borders on grouped panels.

**Components to build once and reuse:**
- `TitleTab`, `StagePill`, `DashedPanel`, `MetricTile` (big number + label + target + status dot)
- `PhoneFrame` (390×844 scaled), `BuyerPhone`, `MakerPhone` (Hindi/English toggle)
- `Chip` (existing-Meesho vs new), `FormulaPopover`, `SourceBadge`, `DecisionCard` (Invest / Tighten / Stop), `Timeline` (Day −14 → Day 90), `EventLog`, `ImpactTracker`

**Colour meaning, used consistently:**
- Orange = maker action
- Magenta = bot/system action
- Plum = Meesho
- Green/amber/red = status only

**Every component carries a tag:**
- "Existing Meesho system" (boost, swap, Valmo, quality score, supplier panel, promotions, ads)
- "New, built in pilot"
- "Partner-run" (Pack Point)

**Layout and polish:**
- Desktop-first (projector at 1366×768 and 1920×1080 must look right), responsive down to tablet.
- A **Focus mode** enlarges one of the three views for projection.
- Motion is subtle (Framer Motion fades/slides ≤ 250 ms).
- Accessible contrast; keyboard navigation for the tour (← →).

---

## 5. Personas (three cohorts, all fully playable)

All three run on the **same engine**; only their data and branches differ. The prototype's main tour uses **Persona 1** as the hero. Each persona page explains **problem → what we heard → solution path → outcome** in detail.

### Persona 1: Offline Only (HERO)
**Hiren Patel, Shree Ganesh Steelware, Rajkot · Home & Kitchen**

- **Profile:** integrated maker (owns steel coil input and machines); ₹8 Cr turnover; 45 workers; ~25% idle capacity; sells through 2 distributors; never sold online.
- **Main ask:** "Will it sell? Who packs it?"
- **Pain points:** doesn't know the per-order cost stack; single-order packing and 24–48 h dispatch don't fit a bulk factory; no listing experience; afraid of stock sitting unsold.
- **Hero SKU:** 1 L stainless steel bottle.
- **Demand gap:** 300–450 orders/week unserved at ₹150–170, 600 committed; likely share ~20% → 9–13/day; B = ₹160.
- **Cost check / bot:** making cost ₹80; packaging ₹6; shipping + fixed fee ₹32; returns buffer ₹8; GST 5% inside price ₹7 → **list ₹148, take-home ₹15/unit**; break-even ₹132; band ₹132–160.
- **Lot and lead time:** first lot 150 units (₹12,000 at cost); minimum run 100; lead time 5 days + 2 safety.
- **Fulfilment:** Cluster Pack Point (Rajkot node; starts at 34 makers → fee ₹44; crosses 40 in week 7 → ₹30). Before the node is live he self-ships with a "pack later" lot; Launch 2 onward via the node.

  Note: ₹148 is below `PACK_POINT_MIN_PRICE` (₹175). The engine must surface this honestly: "At ₹148 the Pack Point fee eats most of your saving; we recommend self-ship for this SKU and the Pack Point for your casserole (₹265)." His **second SKU, the 1.5 L steel casserole at ₹265**, uses the Pack Point. This is a deliberate PM trade-off moment.

- **Growth-loop events:**
  - Day 33 restock: 11/day, 84 on hand → reorder at 77, next batch 230.
  - Day 38 coach: CTR 1.6% vs 4.2% → main photo fix → recovers to 3.9%.
  - Day 52 B drops to ₹155 → price-hold alert → he re-prices to ₹148 (still in band, holds).
  - Day 64 the 750 ml sipper slows → stop → switch to the 1.5 L casserole (200/week unserved, same steel).

### Persona 2: Online Elsewhere
**Ayesha Siddiqui, Siddiqui Metal Crafts, Moradabad · Home & Kitchen**

- **Profile:** integrated maker; ₹14 Cr turnover; sells on Amazon and Flipkart (lots in their warehouses); not on Meesho.
- **Main ask:** "What's my net after fees and RTOs?"
- **Pain points:** Meesho price bands look too low; zero ratings on Meesho despite ratings elsewhere; fears higher RTO on a COD-heavy base; worried about undercutting her Amazon price.
- **Path differences:**
  - Cost check shows **take-home on Meesho vs Amazon side by side**: the same ex-works price, a different fee stack (Meesho 0% commission vs a referral fee).
  - The pitch leads with the take-home calculator.
  - Ships herself (already set up).
  - Joins **Launch Week 1**.
  - RTO per SKU + prepaid nudge address the COD fear.
- **Channel conflict:** not solved with Meesho-only packs (dropped). It's explained honestly: "Your factory price is the same everywhere; the fee stack differs, and Meesho's buyer (Tier 2–4, 77% COD) is a new order, not a moved one."
- **Hero SKU:** brass-finish steel serving bowl set.

### Persona 3: Churned from Meesho
**Sunita Das, Shree Durga Imitation Jewellery, Kolkata · Fashion Accessories (imitation jewellery)**

Based on our real call: listed 20–30 products, high returns, fake COD orders, low visibility, switched off ads, running at a loss.

- **Main ask:** "Will anyone see my listings this time?"
- **Pain points:** no organic visibility without ratings; long wait to first order; ad spend burned; a worse-material copy took the price tag; returns and swapped items; claims recover about half.
- **Path differences:**
  - **Win-back diagnosis** of her old listing: 2,400 views → 38 clicks → main photo the likely reason; refusal rate 31% vs category 22%.
  - She inherits a seller-level quality score (show it).
  - Jewellery set at **₹150**: below ₹175, so self-ship is recommended. Returns are tackled with RTO rate per SKU, the listing-fix coach (expectation returns: "looks bigger in photo"), a scale photo and the prepaid nudge.
  - Launch Week **2** (Fashion Accessories).
  - The coach escalates to a **KAM** once (two failed fixes on one SKU) → the KAM finds plating that tarnishes → a product fix on the next batch → a new coach rule is created ("tarnish complaints → plating check").
- **Unit economics:** factory ₹60 + shipping, fees and GST ₹49 + packing, return buffer and taxes ₹13 + maker keeps ₹28 = ₹150; resellers sell the same set at ₹180–200.

### Every persona page shows

1. Who they are
2. Their main question
3. Pain points mapped to our 6-stage journey (Decide → Set up & stock → Go live → Get & fulfil → Close & settle → Stay or leave)
4. **What changes for them** (lever by lever)
5. **Their 90-day outcome vs the status-quo counterfactual**
6. Button: "Play their journey"

---

## 6. Categories (Category Lab: "which categories, and which not")

**Scorecard** (editable weights; ranking re-sorts live):

| Category | Spec verifiability (30%) | Savings after RTO (25%) | Middleman margin capturable (25%) | Factories reachable (20%) | Score |
|---|---|---|---|---|---|
| Home & Kitchen | 5 | 5 | 4 | 4 | 91 |
| Fashion Accessories | 4 | 4 | 5 | 4 | 85 |
| Footwear | 5 | 2 | 3 | 5 | 75 |
| Beauty & Personal Care | 3 | 5 | 4 | 3 | 75 |
| Electronics & branded FMCG | 4 | 4 | 1 | 1 | 53 |
| Apparel | 1 | 1 | 3 | 5 | 46 |

`score = Σ(rating/5 × weight)`

**Category cards** (each with a "Run a 30-day launch simulation" button using the same engine):

| Category | Status | Hero SKU | Key parameters | Special rule |
|---|---|---|---|---|
| Home & Kitchen | Launch M1 (full lifecycle) | 1 L steel bottle | Returns 6–9%; Pack Point above ₹175 | BIS/ISI mark favours certified makers |
| Fashion Accessories | Launch M2 | Jewellery set ₹150 | Returns 18–22%; self-ship below ₹175 | High copy risk: the answer is speed and price-hold, not copyright (dropped at G4) |
| Beauty & Personal Care | Launch M3 | Herbal hair oil 100 ml | Low returns | **Gate:** order book opens only once verification covers formulation (licence check) |
| Footwear | Launch M4 | EVA slippers | Returns 22–35% | **Gate:** go/no-go after ~10 weeks of H&K return data; size-fit returns drive listing-fix rules |
| Kids & Baby | Not sized | — | 10.48% of orders | Needs its own quality/safety standard first |
| Apparel | Later | — | 36% of orders, largest pool | Fails both buyer tests (spec verifiability, savings after 18–32% returns) |
| Electronics & branded FMCG | Excluded | — | — | Margin belongs to the brand, MRP-capped, mostly imported; integrated makers rare |

**Also show the maker Type × Turnover filter:**
- **Type:** integrated (owns input + machines) = high; job-work = medium; contract/assembler = low; trader/MRP brand = none.
- **Turnover:** < ₹5 Cr (edge exists, supply breaks); **₹5–25 Cr (target)**; > ₹25 Cr (courted by Amazon/Flipkart).
- **Lesson to display:** "A ₹50 Cr trader moves more volume than an ₹8 Cr integrated maker but removes ₹0 of the ₹72; the integrated maker removes all of it." Scale ≠ cost edge; ownership is.

---

## 7. Information architecture (routes, all hash-routed)

| Route | Page | Must contain |
|---|---|---|
| `#/` | Landing | One-line pitch; the formula; three persona cards; the "Start 4-minute judge tour" CTA; tiles to every section; "Answers the PS" map (Q1–Q4 → pages) |
| `#/problem` | The problem | PS in plain words; the ₹265 order breakdown (who takes what); two problems × four challenges; what we heard (4 calls, quotes, takeaways) |
| `#/categories` | Category Lab | Scorecard with editable weights; category cards; Type × Turnover filter; "Run 30-day sim" per category (opens a drawer with results; no new route needed) |
| `#/personas` | Three cohorts | Side-by-side comparison table + a card per persona |
| `#/personas/:id` | Persona detail | Problem → solution → outcome vs counterfactual; "Play journey" |
| `#/journey/:id` | **The journey (core)** | Timeline scrubber; three views; chapter narration; impact tracker; event log; Focus mode |
| `#/control-room` | Meesho control room | Tabs: Demand engine · Benchmark B · Ledger · Pack Point ops · Launch Week (district control charts) · Gates · Coach & KAM queue · Cohort metrics |
| `#/economics` | Unit economics | Per-order waterfall for maker / buyer / Meesho / Pack Point partner / couriers; Pack Point P&L by makers pooled (slider); payment-cycle cash view |
| `#/impact` | Scorecard and scale | Day-90 scorecard per persona; the formula with real values; zoom-out "×620 makers" and "scale target 3,050"; 10x view (year 2: more clusters, categories, apparel when tests pass) |
| `#/levers` | Gates and levers | 4 gates; enabler rule; all 39 levers filterable (kept/merged/dropped/deferred, failing gate, reason) |
| `#/break-it` | What-if lab | Scenario switches (section 9) with live results and "which guardrail caught it" |
| `#/verify` | Numbers and policy | Every constant: value, source, status; policy checks; known caveats |
| `#/roadmap` | 30-60-90 | Sprints A–F, gates at day 30/60/90 with kill criteria, linked to the metrics |
| `#/tour` | Judge tour | 12–14 steps across the pages above with captions; ← → keys; exit any time |

**Global UI:**
- Top nav with every section.
- Persistent "Verify" toggle: every number gets a dotted underline; click → popover with formula, inputs, source, status.
- Persona switcher in the journey header.
- Seed and "Reset scenario" in a settings menu.
- Breadcrumbs.
- Footer: "Synthetic data. Policy facts verified against public Meesho seller guides and Meesho's filing; mentor inputs marked."

---

## 8. The journey page in detail (the heart of the prototype)

**Layout:**
- Top: a timeline scrubber from Day −14 to Day 90, with chapter markers and Day-30/60/90 gate markers.
- Left: **Maker phone** (Hindi/English).
- Centre: **Meesho control room** mini-panel for the current chapter.
- Right: **Buyer phone**.
- Right rail (collapsible): **Impact tracker** (the formula with terms lighting up; maker units/revenue/take-home/cash tied in stock; buyer price vs B and vs reseller, total saved; Meesho orders, contribution, RTOs avoided).
- Bottom: **Event log** ("Day 23 · Ramnagar district · 14 orders · 1 RTO (no charge to maker) · 1 return weighed: −62 g vs dispatch → buyer swap, claim denied, maker not charged").

**Chapters** (each = a step in the tour; each step changes all three views):

| # | Day | Chapter | Maker phone | Control room | Buyer phone |
|---|---|---|---|---|---|
| 0 | −14 | Meesho finds the gap | — | Demand engine: Analyse → Diagnose (supply gap) → Size (open gap, likely share, confidence) → Suggest; B computed (10-listing table with exclusions) | Search results for "steel bottle 1L": few good listings |
| 1 | −10 | Outreach | WhatsApp (after IndiaMART opt-in) with persona-specific teaser; "forecast, not a guarantee" | Outreach funnel; opt-in compliance check | — |
| 2 | −9 | Cost check | Two inputs → verdict vs B (try "near miss" and "not a fit" toggles) | Band visual: break-even ↔ B | — |
| 3 | −8 | Sign-up + records | Seller type question | GST + Udyam check ✓ (toggle: trader → mismatch → not launch-eligible) | — |
| 4 | −7 | Listing bot | 3 screens (product → quantity → price) | Ledger: gap shrinks by the committed lot; crowded meter | — |
| 5 | −6 | Fulfilment choice | Self-ship vs Pack Point, with the price-threshold advice | Rajkot node: makers pooled counter, fee curve | — |
| 6 | 0–18 | Order book + production | Order book (slots, cap, expected orders, dates); stock-ready checklist | Slot allocation (oversubscribed → lower price wins); inbound weigh-in | — |
| 7 | 21–25 | Launch Week | Live orders, stock, payout timeline (7 days after delivery) | District control chart (launch vs control), lift so far; Pack Point pick/pack/QC queue | Launch section (compliant copy), product page, checkout (COD/prepaid) |
| 8 | 22–28 | Returns & RTO | Return notifications with outcomes | Fault attribution table (weight out vs back); RTO vs return cost rules (policy); RTO rate per SKU | Return request flow |
| 9 | 30 | Gate 1 | Results card ("you earned / sold / stock left") | Stick rate, lift, sell-through, prices held → **Invest / Tighten / Stop**, with the rule shown | — |
| 10 | 31–45 | Restock + coach | Dated restock prompt; one Hindi nudge; one tap | Reorder-point math; coach trigger fired; fix success after 14 days | Listing with the new photo |
| 11 | 46–60 | B moves + Gate 2 | Price-hold alert | B recalculated; durability; Pack Point pays-or-waits (Gate 2) | Price shown |
| 12 | 61–80 | Make to demand | Stop the slow SKU; switch suggestion; second listing in 2 minutes | Open gaps on the same material/process; ledger | New product live |
| 13 | 90 | Gate 3 + scorecard | Day-90 earnings summary | Cohort metrics vs targets; makers per manager; **scale or stop** | — |

**Counterfactual toggle ("Without our solution"):** replays the same persona under today's Meesho:
- no demand data → guessed lot of 500 units;
- no launch → slow first orders;
- no coach → churns ~day 25 with unsold stock.

Show both lines on one chart (cumulative orders, take-home, stock left). This is the most persuasive single visual; make it excellent.

---

## 9. Break-it lab (scenarios judges can trigger)

Each scenario reruns the simulation and shows: what happened → which guardrail fired → what it cost → where it is in the deck.

| # | Scenario | Expected outcome |
|---|---|---|
| 1 | Maker raises price after reviews | Auto price-hold: launch slot removed, then visibility cut |
| 2 | Maker uses thinner steel | NAD returns > 1.5× norm → test buy flagged → visibility cut |
| 3 | Reseller signs up as "manufacturer" | Record mismatch → not launch-eligible; can't reach B anyway |
| 4 | Rival dumps stock to drag B down | Percentile + minimum orders keep B stable; weight cap shown |
| 5 | Everyone chases the same gap | Ledger ≥ 90% → "crowded" → teaser paused → switch suggestions |
| 6 | Only 25 makers at the node | Fee ₹44; node waits; self-ship continues; Gate 2 = wait |
| 7 | Launch flops | Stick 0.3, lift 1.1× → Tighten; rerun with adjusted eligibility |
| 8 | Forecast over-promises | Attainment < 60% by day 14 → confidence lowered, ranges widened |
| 9 | Coach fix fails twice | KAM queue; cause logged; new rule created |
| 10 | Sale-week B distortion | Sale days excluded; B unchanged |

---

## 10. Simulation engine (spec)

`src/engine/simulate.ts` exports `simulate({ personaId, seed, overrides, scenario, counterfactual }) → { days: DayState[], events: Event[], kpis, gates }`.

- **Seeded RNG** (mulberry32). No `Math.random` anywhere else.
- **Daily loop**, Day −14 to 90. State includes:
  - funnel: impressions, clicks, orders by district (launch vs control), COD/prepaid split
  - fulfilment: deliveries, RTOs, customer returns (with reasons), stock on hand
  - commitments, B per day, price
  - money: payouts (paid 7 days after delivery), take-home, cash in stock
  - coach and control: coach triggers, gate decisions, KAM cases
- **Demand:** `expectedDaily = openGap/7 × likelyShare × launchMultiplier(day) × listingQuality × priceFactor`, plus noise. The launch multiplier applies in launch districts only on days 21–25; after that the boost decays over 3–6 months (mentor fact).
- **RTO** probability from the COD/prepaid mix (COD fail 22.3%, prepaid fail 2.72%) → blended 17.8%. RTO costs the maker no shipping when dispatched on time; the Pack Point fee is charged per **delivered** order.
- **Customer returns** by category rate; reasons split into product / expectation / size / swap. Swaps detected by the weight check at the Pack Point (self-ship makers instead file a claim recovering ~50%).
- **TCS 0.5% and TDS 0.1%** are withheld from payouts and shown as claimable credits, not costs.
- **Every derived number** comes from a pure function in `formulas.ts` with unit tests.

**Synthetic data generators** (`src/data/generate/*`):
- 10-listing B tables per product type
- 30–50 cohort makers per launch with prices generated so the cohort average clears the price-drop target
- districts (12, half control)
- buyer names/cities for the buyer phone
- outreach lists

All seeded.

---

## 11. Tech stack and structure

- **Stack:** Vite + React 18 + TypeScript (strict) + Tailwind CSS + React Router (HashRouter) + Zustand (state) + Recharts (charts) + Framer Motion + @fontsource (Poppins, Cardo) + lucide-react (icons). No other runtime deps without asking me.
- **Tests:** Vitest (formulas, engine determinism, constants integrity) + Playwright (e2e).
- **Builds:**
  1. Normal static build (`dist/`) deployable to Netlify/Vercel/GitHub Pages.
  2. **A single self-contained `index.html`** via `vite-plugin-singlefile`, so the prototype can be emailed or opened offline with a double-click.

```
src/
  app/ (routes, layout, nav, tour)
  components/ (design system)
  views/ (Landing, Problem, Categories, Personas, PersonaDetail, Journey, ControlRoom, Economics, Impact, Levers, BreakIt, Verify, Roadmap)
  journey/ (chapters/*, MakerPhone/*, BuyerPhone/*, ControlPanels/*)
  engine/ (simulate.ts, formulas.ts, rng.ts, scenarios.ts, gates.ts)
  data/ (constants.ts, personas.ts, categories.ts, levers.ts, research.ts, copy.ts, generate/*)
  i18n/ (en.ts, hi.ts for maker-phone strings)
tests/ (unit/*, e2e/*)
```

---

## 12. Build phases (stop and report after each)

### Phase 0: Foundations
- Scaffold the project; Tailwind theme with the palette; fonts; the design-system components (with a hidden `#/styleguide` page that the e2e tests visit).
- `constants.ts` with every value in section 3, each with source/status.
- `formulas.ts` covering: B, band, take-home, open gap, likely share, expected daily, reorder point, next batch, stick rate, lift, price drop delivered, Pack Point cost/fee curve, storage cost, saving per order, category score, the C2M formula.
- Unit tests reproducing the deck's worked numbers:
  - break-even ₹132; take-home ₹15 at ₹148
  - lot 126–182 → 150
  - reorder point 77, next batch 230
  - fee ₹44/₹30/₹26/₹23
  - category scores 91/85/75/75/53/46
  - 183.4 × 39.8% ≈ 73 Cr
  - ₹170/₹8.09 ≈ 21
- All routes stubbed with real titles and working nav (no blank pages).
- Playwright link-crawler test: start at `#/`, click every link/button with `data-nav`, assert no 404, no console error, every page has a heading and a "next" path.

**Acceptance:** `npm test` green; `npm run e2e` green; screenshot of the styleguide.

### Phase 1: Simulation engine + synthetic data
- `simulate()` per section 10; scenarios; counterfactual; three personas' data; categories; cohort generator.
- Tests: determinism (same seed → identical output); no NaN; stock never negative; payouts lag delivery by 7 days; cohort price drop ≥ target; the hero's chapter events fire on the specified days.

**Acceptance:** print a day-by-day table for Persona 1 (days 20–35) and the gate results for all three personas, plus the counterfactual for Persona 1.

### Phase 2: Landing, Problem, Personas
- Landing per the IA (formula strip, persona cards, the "Answers the PS" map, tour CTA).
- Problem page with the ₹265 breakdown (interactive donut: click a slice → who takes it and why) and research (4 calls, takeaways; quotes marked as paraphrased/translated).
- Personas comparison + three detail pages with problem → solution → outcome vs counterfactual (mini charts from the engine).

**Acceptance:** screenshots at 1366×768; all links work.

### Phase 3: Category Lab
- Editable weights → live re-rank; category cards with status and special rules; Type × Turnover filter with the ₹50 Cr trader vs ₹8 Cr maker lesson.
- "Run 30-day sim" per launch category (drawer with orders, returns, price drop, stick rate, decision) using the same engine; Kids & Baby / Apparel / Electronics show "why not yet" with the failing test, not a sim.

**Acceptance:** changing weights so that returns matter less moves Apparel up, and the UI explains why it still waits.

### Phase 4: Journey shell
- Timeline scrubber, the three-view layout, Focus mode, impact tracker, event log, persona switcher, counterfactual toggle, Verify popovers wired to `formulas.ts`.
- Chapters 0–3 fully built (gap → outreach → cost check → sign-up).

**Acceptance:** scrubbing anywhere updates all three views consistently; Verify works on every number shown.

### Phase 5: Onboarding chapters
- Listing bot (3 screens, interactive: tap through, edit margin → take-home and band update live; editing price above B blocks go-live with the reason).
- Ledger visual; fulfilment choice with the ₹175 threshold advice; order book; slot allocation; inbound weigh-in.
- Persona differences:
  - Ayesha: Amazon vs Meesho take-home comparison.
  - Sunita: win-back diagnosis + inherited score.

**Acceptance:** each persona's chapters 0–6 play without dead ends; the hero's ₹148 → self-ship advice and casserole → Pack Point both appear.

### Phase 6: Launch Week, returns, Gate 1, Control Room
- Buyer phone (launch section with compliant copy, product page, checkout, returns).
- District control chart; Pack Point ops queue; fault-attribution table driven by the engine; RTO vs return cost rules per policy.
- Gate 1 decision card with the rule and the inputs.
- Control Room page with all tabs reading live engine data.

**Acceptance:** run scenario "launch flops" → Gate 1 shows Tighten with correct numbers; run base → Invest.

### Phase 7: Growth loop, Make to demand, KAM, Gate 2/3, Economics, Impact
- Restock prompt with the math; coach weekly card (Hindi/English) with one-tap fix and the 14-day re-check; B-moves price-hold; switch suggestion and second listing; KAM queue with the escalation rule and new-rule creation; Gate 2 and Gate 3.
- Economics page (waterfalls, Pack Point P&L slider, payment-cycle cash view).
- Impact page (scorecards, formula with values, ×620 and scale-target view, 10x/year-2 view).

**Acceptance:** Persona 3's KAM path triggers exactly once in base; Persona 1's restock = 230 units on day 33.

### Phase 8: Break-it lab, Levers, Roadmap, Verify, Judge tour
- All 10 scenarios with "guardrail fired" explanations and deck references.
- Levers page with the 39 levers.
- Roadmap with sprints and gates linked to live metrics.
- Verify page listing every constant with source/status and a "policy checks" section.
- Judge tour (12–14 steps, ~4 minutes, ← →, progress dots, skip/exit, resumes where left).

**Acceptance:** the tour completes end to end without touching the mouse except "Start".

### Phase 9: QA, polish, ship
- **Copy audit:** grep the build for forbidden words ("lowest", "cheapest", "guarantee" outside "not a guarantee", "sale" as framing, "Direct from factory", "Verified factory") → zero hits in buyer-facing UI.
- **Number audit:** a test that renders every page and asserts no raw number literal appears outside constants/formulas (lint rule or a snapshot check of known values).
- **Accessibility:** contrast and keyboard checks.
- **Performance:** first load < 2 s locally; bundle size report.
- **Responsive:** check 1920×1080, 1366×768, 1024×768.
- **Final e2e:** link crawl + tour + one full journey per persona + every scenario.
- **Builds:** produce both outputs (normal `dist/` and the single-file `index.html`).
- **README:** how to run, how to present (tour + focus mode), what's synthetic, and the source/status legend.

**Acceptance:** all tests green; I get both builds and a 10-line demo script.

---

## 13. Definition of done (judge's-eye checklist)

- [ ] Every PS question (Q1–Q4) has a page that answers it, linked from the landing page.
- [ ] Three personas each have a distinct, complete journey and a counterfactual.
- [ ] One category (Home & Kitchen) shows the full 90-day lifecycle; other categories show why they launch later or not at all.
- [ ] Every number is traceable (Verify) and consistent with the deck; the hero's 7.5% vs the cohort's ≥ 8% is shown honestly.
- [ ] Meesho policies are reflected correctly: 0% commission, 7-day payout, RTO not charged when dispatched on time, return shipping charged, 24–48 h dispatch, TCS/TDS as credits, 5% GST.
- [ ] Each component is tagged existing / new / partner-run (feasibility).
- [ ] North star, counter-metrics, control group, decision rules and kill criteria are visible.
- [ ] No forbidden claims; forecasts say "not a guarantee".
- [ ] No broken links; works offline as a single file; presentable in 4 minutes.