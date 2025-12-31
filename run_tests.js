import { runner, afterEach } from './tests/testRunner.js';
import { resetMocks } from './tests/test-mocks.js';
import './tests/setup.js';

// Global cleanup after each test
afterEach(() => {
    resetMocks();
    if (global.gc) {
        global.gc();
    }
});

// List of all test files
const allTestFiles = [
    './tests/hero.test.js',
    './tests/hero_advanced.test.js',
    './tests/sites.test.js',
    './tests/combat.test.js',
    './tests/combat_advanced.test.js',
    './tests/mapManager.test.js',
    './tests/mana.test.js',
    './tests/terrain.test.js',
    './tests/time.test.js',
    './tests/unit.test.js',
    './tests/saveManager.test.js',
    './tests/card.test.js',
    './tests/crystalStorage.test.js',
    './tests/enemy.test.js',
    './tests/siteInteraction.test.js',
    './tests/tutorialManager.test.js',
    './tests/hexgrid.test.js',
    './tests/game.test.js',
    './tests/game_logic.test.js',
    './tests/combatAnimations.test.js',
    './tests/touchController.test.js',
    './tests/animator.test.js',
    './tests/particles.test.js',
    './tests/tooltip.test.js',
    './tests/debug.test.js',
    './tests/combo.test.js',
    './tests/skills.test.js',
    './tests/timeManager.test.js',
    './tests/ui.test.js',
    './tests/map_exploration.test.js',
    './tests/enemy_spawning.test.js',
    './tests/game_reset.test.js',
    './tests/ui_reset.test.js',
    './tests/scenarios.test.js',
    './tests/ai_movement.test.js',
    './tests/game_integration.test.js',
    './tests/cardAnimations.test.js',
    './tests/combat_scenarios.test.js',
    './tests/fuzz_game.test.js',
    './tests/soundManager.test.js',
    './tests/ui_hand.test.js',
    './tests/ui_interactions.test.js',
    './tests/ui_tooltips.test.js',
    './tests/content_expansion.test.js',
    './tests/level_up.test.js',
    './tests/site_rewards.test.js',
    './tests/combat_ranged.test.js',
    './tests/statusEffects.test.js',
    './tests/enemyAI.test.js',
    './tests/combat_logic.test.js',
    './tests/tutorial.test.js',
    './tests/statistics.test.js',
    './tests/particles_boost.test.js',
    './tests/game_flow.test.js',
    './tests/achievements.test.js',
    './tests/combat_boost.test.js',
    './tests/enemy_boost.test.js',
    './tests/ui_boost.test.js',
    './tests/animator_boost.test.js',
    './tests/hero_boost.test.js',
    './tests/game_boost_final.test.js',
    './tests/game_logic_boost.test.js',
    './tests/game_ui_boost.test.js',
    './tests/siteInteraction_boost.test.js',
    './tests/tutorial_boost.test.js',
    './tests/final_push.test.js',
    './tests/final_touch.test.js',
    './tests/chaos.test.js',
    './tests/long_session.test.js',
    './tests/save_logic_boost.test.js',
    './tests/pbt_combat.test.js',
    './tests/visual_snapshots.test.js',
    './tests/architecture.test.js',
    './tests/save_load_resilience.test.js',
    './tests/game_flow_extended.test.js',
    './tests/combat_edge_cases.test.js',
    './tests/stability.test.js',
    './tests/time_cycle.test.js',
    './tests/ui_sync.test.js',
    './tests/resilience.test.js',
    './tests/ui_and_combat_flow.test.js',
    './tests/achievements_integration.test.js',
    './tests/animator_stress.test.js',
    './tests/coverage_boost_v3.test.js',
    './tests/global_events.test.js'
];

// Parse args
const args = process.argv.slice(2);
const options = {};
let shardIndex = 0;
let totalShards = 1;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--grep' && i + 1 < args.length) {
        options.grep = args[i + 1];
        i++;
    } else if (args[i].startsWith('--shard=')) {
        const parts = args[i].split('=')[1].split('/');
        shardIndex = parseInt(parts[0], 10) - 1; // 1-based to 0-based
        totalShards = parseInt(parts[1], 10);
    }
}

// Filter files by shard
let filesToRun = allTestFiles;
if (totalShards > 1) {
    const chunkStats = Math.ceil(allTestFiles.length / totalShards);
    const start = shardIndex * chunkStats;
    const end = Math.min(start + chunkStats, allTestFiles.length);
    filesToRun = allTestFiles.slice(start, end);
    console.log(`Running Shard ${shardIndex + 1}/${totalShards}: ${filesToRun.length} files (${start} - ${end})`);
}

console.log('Starting dynamic imports...');
for (const file of filesToRun) {
    await import(file);
}

console.log('Starting tests...');
if (options.grep) {
    console.log(`Filtering tests by: "${options.grep}"`);
}

runner.run(options);
