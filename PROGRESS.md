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
