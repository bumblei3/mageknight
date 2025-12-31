import { runner, afterEach } from './tests/testRunner.js';
import { resetMocks } from './tests/test-mocks.js';
import './tests/setup.js';

// Global cleanup after each test to prevent memory leaks in CI
afterEach(() => {
    resetMocks();
    if (global.gc) {
        global.gc();
    }
});

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
await import('./tests/game_logic.test.js');
await import('./tests/combatAnimations.test.js');
await import('./tests/touchController.test.js');
await import('./tests/animator.test.js');
import './tests/particles.test.js';
import './tests/tooltip.test.js';
import './tests/debug.test.js';
import './tests/combo.test.js';
import './tests/skills.test.js';
import './tests/timeManager.test.js';
await import('./tests/ui.test.js');
await import('./tests/map_exploration.test.js');
await import('./tests/enemy_spawning.test.js');
await import('./tests/game_reset.test.js');
await import('./tests/ui_reset.test.js');
await import('./tests/scenarios.test.js');
await import('./tests/ai_movement.test.js');
await import('./tests/game_integration.test.js');
await import('./tests/cardAnimations.test.js');
await import('./tests/combat_scenarios.test.js');
await import('./tests/fuzz_game.test.js');
await import('./tests/soundManager.test.js');
await import('./tests/ui_hand.test.js');
await import('./tests/ui_interactions.test.js');
await import('./tests/ui_tooltips.test.js');
await import('./tests/content_expansion.test.js');
await import('./tests/level_up.test.js');
await import('./tests/site_rewards.test.js');
await import('./tests/combat_ranged.test.js');
await import('./tests/statusEffects.test.js');
await import('./tests/enemyAI.test.js');
await import('./tests/combat_logic.test.js');
await import('./tests/tutorial.test.js');
await import('./tests/statistics.test.js');
await import('./tests/particles_boost.test.js');
await import('./tests/game_flow.test.js');
await import('./tests/achievements.test.js');
await import('./tests/combat_boost.test.js');
await import('./tests/enemy_boost.test.js');
await import('./tests/ui_boost.test.js');
await import('./tests/animator_boost.test.js');
await import('./tests/hero_boost.test.js');
await import('./tests/game_boost_final.test.js');
await import('./tests/game_logic_boost.test.js');
await import('./tests/game_ui_boost.test.js');
await import('./tests/siteInteraction_boost.test.js');

await import('./tests/tutorial_boost.test.js');
await import('./tests/final_push.test.js');
await import('./tests/final_touch.test.js');
await import('./tests/chaos.test.js');
await import('./tests/long_session.test.js');
await import('./tests/save_logic_boost.test.js');
await import('./tests/pbt_combat.test.js');
await import('./tests/visual_snapshots.test.js');
await import('./tests/architecture.test.js');
await import('./tests/save_load_resilience.test.js');
await import('./tests/game_flow_extended.test.js');
await import('./tests/combat_edge_cases.test.js'); // Formerly v2
await import('./tests/stability.test.js');
await import('./tests/time_cycle.test.js');
await import('./tests/ui_sync.test.js');
await import('./tests/resilience.test.js');
await import('./tests/ui_and_combat_flow.test.js');
await import('./tests/achievements_integration.test.js');
await import('./tests/animator_stress.test.js');
await import('./tests/coverage_boost_v3.test.js');


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
