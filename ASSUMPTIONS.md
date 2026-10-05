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
