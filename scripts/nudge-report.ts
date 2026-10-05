/** Prints every nudge each maker gets, day by day, with no actions recorded. Run: npx vite-node scripts/nudge-report.ts [hiren|ayesha|sunita] */
import { simulate } from '../src/engine/simulate';
import { PERSONA_SPECS, type PersonaId } from '../src/data/personas';
import { nudgeTimeline, NUDGE_TYPES } from '../src/engine/nudges';
import { C } from '../src/data/constants';

const only = process.argv[2] as PersonaId | undefined;
for (const p of PERSONA_SPECS.filter((x) => !only || x.id === only)) {
  const run = simulate({ personaId: p.id });
  const state = { onboarding: { committedDay: null }, actions: {}, packed: {}, handed: {}, notReady: {} };
  const all = nudgeTimeline({ id: p.id, persona: p, run }, state, C.TIMELINE_DAYS.value.max);
  const counts = Object.fromEntries(NUDGE_TYPES.map((t) => [t, all.filter((n) => n.type === t).length]));
  console.log(`\n${p.name}: ${all.length} nudges`);
  console.log('  by type:', Object.entries(counts).filter(([, n]) => n > 0).map(([t, n]) => `${t} ${n}`).join(', '));
  console.log('  never fired:', Object.entries(counts).filter(([, n]) => n === 0).map(([t]) => t).join(', '));
  if (only) for (const n of all) console.log(`  day ${String(n.firedDay).padStart(3)} [${n.type}] ${n.title}`);
}
