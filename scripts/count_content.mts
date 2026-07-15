// Counts real runtime content from the actual source exports.
import {
  GOLDYX_STARTER_DECK, NOROWAS_STARTER_DECK, ARYTHEA_STARTER_DECK, TOVAK_STARTER_DECK,
  SAMPLE_SPELLS, SAMPLE_ARTIFACTS, SAMPLE_ADVANCED_ACTIONS,
} from '../js/card/CardDefinitions';
import { ENEMY_DEFINITIONS, BOSS_DEFINITIONS, CARD_TYPES } from '../js/constants';
import { UNIT_INFO, UNIT_TYPES } from '../js/unit';
import { HERO_DEFINITIONS } from '../js/game/HeroManager';
import { HERO_SKILLS } from '../js/skills/skillDefinitions';

// Collect ALL cards across exports (each entry is {id, name, type, ...})
const allCards: any[] = [
  ...GOLDYX_STARTER_DECK, ...NOROWAS_STARTER_DECK,
  ...ARYTHEA_STARTER_DECK, ...TOVAK_STARTER_DECK,
  ...SAMPLE_SPELLS, ...SAMPLE_ARTIFACTS, ...SAMPLE_ADVANCED_ACTIONS,
];

// De-dup by id (starter decks may overlap sample arrays)
const seen = new Set<string>();
const uniqueCards: any[] = [];
for (const c of allCards) {
  const id = c?.id ?? c?.name ?? JSON.stringify(c);
  if (seen.has(id)) continue;
  seen.add(id);
  uniqueCards.push(c);
}

const spellCount = uniqueCards.filter(c => c.type === CARD_TYPES.SPELL).length;
const actionCount = uniqueCards.filter(c => c.type === CARD_TYPES.ACTION).length;
const unitCount = uniqueCards.filter(c => c.type === CARD_TYPES.UNIT).length;
const artifactCount = uniqueCards.filter(c => c.type === CARD_TYPES.ARTIFACT).length;
const tacticCount = uniqueCards.filter(c => c.type === CARD_TYPES.TACTIC).length;
const woundCount = uniqueCards.filter(c => c.type === CARD_TYPES.WOUND).length;

console.log('=== MAGE KNIGHT — REAL CONTENT COUNTS ===');
console.log(`Heroes:            ${Object.keys(HERO_DEFINITIONS).length}  (${Object.keys(HERO_DEFINITIONS).join(', ')})`);
console.log(`Enemies (defs):   ${Object.keys(ENEMY_DEFINITIONS).length}`);
console.log(`Bosses (defs):    ${Object.keys(BOSS_DEFINITIONS).length}  (${Object.keys(BOSS_DEFINITIONS).join(', ')})`);
console.log(`Unit types (info): ${Object.keys(UNIT_INFO).length}  / UNIT_TYPES enum: ${Object.keys(UNIT_TYPES).length}`);
console.log(`Skill groups:      ${Object.keys(HERO_SKILLS).length}  (${Object.keys(HERO_SKILLS).join(', ')})`);
console.log(`Unique cards:      ${uniqueCards.length}  (deduped across decks+samples)`);
console.log(`  - spells:       ${spellCount}`);
console.log(`  - actions:      ${actionCount}`);
console.log(`  - units:        ${unitCount}`);
console.log(`  - artifacts:    ${artifactCount}`);
console.log(`  - tactics:      ${tacticCount}`);
console.log(`  - wounds:       ${woundCount}`);

// Action-effect categories (how many distinct basicEffect.type values)
const effTypes = new Set<string>();
for (const c of uniqueCards) {
  if (c.basicEffect?.type) effTypes.add(c.basicEffect.type);
  if (c.advancedEffect?.type) effTypes.add(c.advancedEffect.type);
}
console.log(`  - distinct effect types: ${[...effTypes].sort().join(', ')}`);

console.log('\n=== ROADMAP TARGETS (M2) vs REALITY ===');
console.log(`Heroes:    target 5+        -> ${Object.keys(HERO_DEFINITIONS).length}`);
console.log(`Enemies:   target 20+       -> ${Object.keys(ENEMY_DEFINITIONS).length}`);
console.log(`Scenarios: target 8+        -> count in ScenarioManager`);
console.log(`Spells:    target all 16     -> ${spellCount}`);
console.log(`Actions:   target all 24     -> ${actionCount}`);
console.log(`Units:     target all 8      -> ${Object.keys(UNIT_INFO).length}`);
