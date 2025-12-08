import { runner } from './tests/testRunner.js';
import './tests/setup.js';

// Import Test Suites
import './tests/hero.test.js';
import './tests/hero_advanced.test.js';
import './tests/sites.test.js';
import './tests/combat.test.js';
import './tests/combat_advanced.test.js';
import './tests/mapManager.test.js';
import './tests/mana.test.js';
import './tests/terrain.test.js';
import './tests/time.test.js';
import './tests/unit.test.js';
import './tests/saveManager.test.js';
import './tests/card.test.js';
import './tests/crystalStorage.test.js';
import './tests/enemy.test.js';
import './tests/siteInteraction.test.js';
import './tests/tutorialManager.test.js';
import './tests/hexgrid.test.js';
import './tests/game.test.js';
import './tests/animator.test.js';
import './tests/particles.test.js';
import './tests/tooltip.test.js';
import './tests/debug.test.js';
import './tests/combo.test.js';
import './tests/skills.test.js';
import './tests/timeManager.test.js';
await import('./tests/ui.test.js');
await import('./tests/combat_advanced.test.js');
await import('./tests/map_exploration.test.js');
await import('./tests/enemy_spawning.test.js');
await import('./tests/game_reset.test.js');
await import('./tests/ui_reset.test.js');
await import('./tests/scenarios.test.js');
await import('./tests/ai_movement.test.js');
await import('./tests/game_integration.test.js');
await import('./tests/cardAnimations.test.js');
await import('./tests/combatAnimations.test.js');
await import('./tests/combat_scenarios.test.js');
await import('./tests/fuzz_game.test.js');
await import('./tests/soundManager.test.js');
await import('./tests/ui_hand.test.js');
await import('./tests/ui_interactions.test.js');
await import('./tests/ui_tooltips.test.js');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--grep' && i + 1 < args.length) {
        options.grep = args[i + 1];
        i++;
    }
}

console.log('Starting tests...');
if (options.grep) {
    console.log(`Filtering tests by: "${options.grep}"`);
}
runner.run(options);
