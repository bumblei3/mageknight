import { spawn } from 'child_process';
import path from 'path';

// List of all test files (93 files total)
const allTestFiles = [
    './tests/achievements_integration.test.js',
    './tests/achievements.test.js',
    './tests/ai_movement.test.js',
    './tests/animator_boost.test.js',
    './tests/animator_stress.test.js',
    './tests/animator.test.js',
    './tests/architecture.test.js',
    './tests/boss_encounters.test.js',
    './tests/cardAnimations.test.js',
    './tests/card.test.js',
    './tests/chaos.test.js',
    './tests/combat_advanced.test.js',
    './tests/combatAnimations.test.js',
    './tests/combat_boost.test.js',
    './tests/combat_edge_cases.test.js',
    './tests/combat_integration.test.js',
    './tests/combat_logic.test.js',
    './tests/combat_ranged.test.js',
    './tests/combat_scenarios.test.js',
    './tests/combat.test.js',
    './tests/combo.test.js',
    './tests/content_expansion.test.js',
    './tests/coverage_boost_v3.test.js',
    './tests/coverage_final_boost.test.js',
    './tests/coverage_gap_fill.test.js',
    './tests/crystalStorage.test.js',
    './tests/debug.test.js',
    './tests/enemyAI.test.js',
    './tests/enemy_boost.test.js',
    './tests/enemy_spawning.test.js',
    './tests/enemy.test.js',
    './tests/final_push.test.js',
    './tests/final_touch.test.js',
    './tests/fuzz_game.test.js',
    './tests/game_boost_final.test.js',
    './tests/game_flow_extended.test.js',
    './tests/game_flow.test.js',
    './tests/game_integration.test.js',
    './tests/game_logic_boost.test.js',
    './tests/game_logic.test.js',
    './tests/game_reset.test.js',
    './tests/game.test.js',
    './tests/game_ui_boost.test.js',
    './tests/global_events.test.js',
    './tests/hero_advanced.test.js',
    './tests/hero_boost.test.js',
    './tests/hero.test.js',
    './tests/hexgrid.test.js',
    './tests/integration_advanced.test.js',
    './tests/level_up.test.js',
    './tests/long_session.test.js',
    './tests/mana.test.js',
    './tests/map_exploration.test.js',
    './tests/mapManager.test.js',
    './tests/newEnemies.test.js',
    './tests/particles_boost.test.js',
    './tests/particles.test.js',
    './tests/pbt_combat.test.js',
    './tests/reproduce_tutorial.test.js',
    './tests/resilience.test.js',
    './tests/save_load_resilience.test.js',
    './tests/save_logic_boost.test.js',
    './tests/saveManager.test.js',
    './tests/scenarios.test.js',
    './tests/simpleTutorial.test.js',
    './tests/siteInteraction_boost.test.js',
    './tests/siteInteraction.test.js',
    './tests/site_rewards.test.js',
    './tests/sites.test.js',
    './tests/skills.test.js',
    './tests/soundManager.test.js',
    './tests/stability.test.js',
    './tests/statistics.test.js',
    './tests/statusEffects.test.js',
    './tests/terrain.test.js',
    './tests/time_cycle.test.js',
    './tests/timeManager.test.js',
    './tests/time.test.js',
    './tests/tooltip.test.js',
    './tests/touchController.test.js',
    './tests/tutorial_boost.test.js',
    './tests/tutorialManager.test.js',
    './tests/tutorial.test.js',
    './tests/ui_and_combat_flow.test.js',
    './tests/ui_boost.test.js',
    './tests/ui_hand.test.js',
    './tests/ui_interactions.test.js',
    './tests/ui_reset.test.js',
    './tests/ui_sync.test.js',
    './tests/ui.test.js',
    './tests/ui_tooltips.test.js',
    './tests/unit.test.js',
    './tests/visual_snapshots.test.js'
];

// Parse args
const args = process.argv.slice(2);
let shardIndex = 0;
let totalShards = 1;
const workerArgs = [];

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--grep' && i + 1 < args.length) {
        // We don't implement grep support in the worker yet for file filtering
        // but we could pass it down if needed.
        // For now, grep filters files.
        const pattern = args[i + 1];
        // Simple filter if grep is used
        // Note: Ideally grep should run inside the test runner too.
        // But the previous implementation filtered FILES? No, testRunner filtered inside.
        // We should pass grep to the worker.
        workerArgs.push('--grep', pattern);
        i++;
    } else if (args[i].startsWith('--shard=')) {
        const parts = args[i].split('=')[1].split('/');
        shardIndex = parseInt(parts[0], 10) - 1;
        totalShards = parseInt(parts[1], 10);
    } else if (args[i] === '--shard' && i + 1 < args.length) {
        const parts = args[i + 1].split('/');
        shardIndex = parseInt(parts[0], 10) - 1;
        totalShards = parseInt(parts[1], 10);
        i++;
    }
}

// Filter files by shard
let filesToRun = allTestFiles;
if (totalShards > 1) {
    const chunkStats = Math.ceil(allTestFiles.length / totalShards);
    const start = shardIndex * chunkStats;
    const end = Math.min(start + chunkStats, allTestFiles.length);
    filesToRun = allTestFiles.slice(start, end);
}

console.log(`Arguments: ${JSON.stringify(args)}`);
console.log(`Sharding Config: Shard ${shardIndex + 1} of ${totalShards}`);
console.log(`Running ${filesToRun.length} files out of ${allTestFiles.length}`);

console.log('Starting execution with process isolation...');

let totalPassedFiles = 0;
let totalFailedFiles = 0;

async function runFile(file) {
    return new Promise((resolve) => {
        // console.log(`\n🚀 Spawning worker for ${file}...`);

        const child = spawn('node', ['--expose-gc', 'run_tests_worker.js', file, ...workerArgs], {
            stdio: 'inherit', // Stream output directly to parent console
            env: process.env
        });

        child.on('close', (code) => {
            if (code === 0) {
                totalPassedFiles++;
                resolve(true);
            } else {
                console.error(`❌ Test failed: ${file}`);
                totalFailedFiles++;
                resolve(false);
            }
        });
    });
}

// Run sequentially to keep memory low and output readable
for (const file of filesToRun) {
    await runFile(file);
}

console.log('\n=============================================');
console.log(`Global Results: Files Passed: ${totalPassedFiles} | Files Failed: ${totalFailedFiles}`);
console.log('=============================================');

if (totalFailedFiles > 0) {
    process.exit(1);
}
