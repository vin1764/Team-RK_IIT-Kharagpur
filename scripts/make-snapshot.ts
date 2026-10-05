/**
 * Writes the hardcoded data the prototype shows: every persona run (with and without the solution)
 * and the four launch-category 30-day runs, at the default seed. The browser only reads this file.
 * Regenerate with: npx vite-node scripts/make-snapshot.ts
 */
import { writeFileSync } from 'node:fs';
import { simulate, simulateCategory } from '../src/engine/simulate';

const personas = Object.fromEntries(
  (['hiren', 'ayesha', 'sunita'] as const).map((id) => [id, { base: simulate({ personaId: id }), cf: simulate({ personaId: id, counterfactual: true }) }]),
);
const categories = Object.fromEntries((['homeKitchen', 'fashionAccessories', 'bpc', 'footwear'] as const).map((id) => [id, simulateCategory(id)]));

writeFileSync('src/data/snapshot.json', JSON.stringify({ personas, categories }));
console.log('wrote src/data/snapshot.json');
