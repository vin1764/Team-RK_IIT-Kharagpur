# Assumptions (MVP run)

Decisions taken where MVP.md or CLAUDE.md was unclear. Each one is the option that best fits both.

## Scope and structure

1. **Continuous run.** The run rules override MVP.md's "stop after each phase": phases M1 to M6 run back to back, with a build, tests, crawler and commit after each one.
2. **Explainer pages.** Levers, Break-it, Verify, Roadmap and the Tour page were already removed in the earlier "core solution only" trim, at the user's request; they can be recovered from commit `6c632bb`. They are not restored. The remaining explainers (Problem, Categories, Journeys, Control room, Economics, Impact) keep working under **Case notes** (`#/notes`). The old home page moves to `#/notes`.
3. **Routes added beyond MVP.md's list.** `#/app` is the login (account picker). Cost check is `#/app/check` and sign-up is `#/app/signup`; MVP.md describes both screens but gives them no route. A logged-in link carries `?as=<account>`, so the crawler and judges can open any account directly with no redirect.
4. **Unfinished screens.** A `READY_APP` set (`src/mvp/ready.ts`) hides the entry points (tabs, setup card, nudge cards) of screens a phase has not built yet, so there is never a dead link.

## Demo clock and state

5. **One clock per account.** Each account has its own demo day, saved with the rest of its state under `meesho-mvp:v1:account:<id>`. Changing the version number discards old saved state.
6. **The simulation is the world.** Orders, returns, payouts and gate decisions come from the precomputed deterministic run (`snapshot.json`). The maker's taps record actions (packed, handed over, nudge actions) and onboarding choices; they don't re-run the engine, which keeps the demo deterministic.
7. **Auto-commit.** If the maker hasn't committed a launch slot by the order-book deadline (day 7), the demo commits it, so "Jump to next nudge" can run the 90 days without onboarding first. The stage banner says so.

## Layout

8. **Phone frame on desktop.** The frame is 390 px wide. Its height is 844 px, or less when the window is shorter, so the whole phone and the demo controls fit at 1366×768 with no scrolling (projector check). On screens under 768 px wide the app is full-screen and the demo controls become a bottom sheet.

## Onboarding (M2)

9. **The cost check is for the hero SKU.** Hiren's second launch SKU (the sipper) gets its numbers in the listing bot's price step. The making cost the maker types replaces the hero's in every later screen.
10. **Edits vs the simulation.** Margins, lots, minimum batch and lead time can be edited, and the edits are saved and shown. The 90-day run stays the precomputed persona run, which uses the recommended values, so the demo stays deterministic.
11. **The seller-type check is simulated.** Every persona's Udyam record says "manufacturer". Choosing wholesaler or reseller shows a mismatch and "Not eligible for Launch Week"; the maker can change the answer.
12. **Demand confidence** comes from `demandConfidence(DEMAND_PAST_LAUNCHES)`, which is 7 synthetic past launches → Medium.
13. **Sample photos** are synthetic placeholder tiles. The "cleaned" version is tagged Simulated.

## Nudge engine (M3)

14. **API.** `nudgesFor(account, day, state)` returns the active nudges, which MVP.md asks for. Alongside it: `nudgesFiredOn` (what fires on one day), `nudgeTimeline` (everything fired so far, used by the inbox and ops log) and `nextNudgeDay` (for "Jump to next nudge"). The account is `{ id, persona, run }`. Nudges carry Hindi copy (`titleHi`, `bodyHi`) and secondary `actions`.
15. **Order nudges are per SKU per day,** not per order, so a day with 12 orders is one card.
16. **Hand-over is confirmed by Valmo's scan.** Parcels count as handed over unless the maker taps "Not ready today" on the pickup nudge. Only then do `dispatch_deadline` (urgent) and `pickup_missed` fire the next day. Without this rule both would fire every day for every order the maker didn't tap.
17. **Escalation fires once per account.** It fires on the engine's KAM case (a fix failed twice; Sunita), or the day after a second nudge is set aside with "Not now". Pickup "Not ready" taps don't count.
18. **Storage nudges** fire from first-in-first-out tracking of each Pack Point lot. In the base 90 days, Hiren's casserole lots sell within the 30 free days, so `storage_warning` and `storage_decision` don't fire. Both are unit-tested on a synthetic run where the lot doesn't sell.
19. **Weekly Pack Point lot** (`send_next_lot`) = the last 7 days' orders. It is skipped when a batch drop is already due that week.
20. **Prepaid nudge**: a weekly check of the 14-day refusal rate against the type's 75th percentile, plus the engine's own refusal trigger.
21. **Nudge actions** are recorded per nudge id. Packing, handing over and "not ready" also update the order state. A set-aside ("Not now") clears the nudge and counts towards escalation.
22. **Ops console.** `#/ops` is the control room in "ops mode": its day and maker follow the maker app's demo clock (moving its slider moves the clock), and it adds a Nudge log tab.

## Operating screens (M4)

23. **Order IDs and labels** are deterministic placeholders (Simulated). Orders show today and yesterday; older days roll up into the last-7-days card.
24. **Returns** list the last 28 days, plus returns arriving tomorrow (in transit). Swaps caught by weight at the node get their own row.
25. **Make-to-demand listings** (casserole, lunch box) open the listing bot pre-filled, since the maker's photos and details already exist. After the fulfilment step they go to the product page, not back to the launch flow.
26. **A SKU shows "Stop"** from the day the engine flags it a slow seller, or once the maker taps "Stop it".

## Ops console and engine fixes (M5)

27. **Pack-later stock** counts as cash in stock only once it is made (at the launch stock-in). Before this fix, Hiren and Ayesha showed ₹11–12k of cash in stock from day −14, which broke "nothing before it exists".
28. **Ops tabs** follow MVP.md section 5. Cohort metrics appear as each one becomes measurable (day 30, 45, 60, 90); "makers active at day 30" has no target, so none is shown. Stick rate is the selected maker's own, since the cohort record has no stick rate.
29. **Section 6 items already done** in the earlier review round and now unit-tested: the ₹265 split, the B table without "your listing" before listing, the ledger in orders/week, the Pack Point fee at the current node size, the Gate 2 rule, Sunita's Tighten → Invest, the scale bridge to ₹657 Cr and the metric labels.
