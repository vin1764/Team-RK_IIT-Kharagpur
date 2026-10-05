import { describe, expect, it } from 'vitest';
import { simulate } from '../../src/engine/simulate';
import type { PersonaId } from '../../src/data/personas';

const PERSONAS: PersonaId[] = ['hiren', 'ayesha', 'sunita'];

describe('engine determinism', () => {
  it.each(PERSONAS)('%s: same seed and settings → identical output', (p) => {
    expect(JSON.stringify(simulate({ personaId: p, seed: 99 }))).toBe(JSON.stringify(simulate({ personaId: p, seed: 99 })));
    expect(JSON.stringify(simulate({ personaId: p, counterfactual: true }))).toBe(JSON.stringify(simulate({ personaId: p, counterfactual: true })));
  });

  it('scenarios are deterministic too', () => {
    for (const scenario of ['launchFlops', 'priceRaise', 'resellerSignup', 'smallNode', 'coachFixFails'] as const) {
      expect(JSON.stringify(simulate({ personaId: 'hiren', scenario }))).toBe(JSON.stringify(simulate({ personaId: 'hiren', scenario })));
    }
  });

  it('a different seed changes the daily texture', () => {
    expect(simulate({ personaId: 'hiren', seed: 1 }).days.map((d) => d.orders)).not.toEqual(
      simulate({ personaId: 'hiren', seed: 2 }).days.map((d) => d.orders),
    );
  });
});
