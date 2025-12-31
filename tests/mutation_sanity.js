import fs from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';

const FILES_TO_MUTATE = [
    {
        path: 'js/hero.js',
        find: 'this.fame += amount;',
        replace: 'this.fame -= amount; // MUTATED',
        description: 'Inverse fame gain'
    },
    {
        path: 'js/combat.js',
        find: 'this.unitBlockPoints += ability.value;',
        replace: 'this.unitBlockPoints -= ability.value; // MUTATED',
        description: 'Inverse unit block bonus'
    }
];

async function runMutationTest() {
    console.log('🧪 Starting Mutation Sanity Check...');

    for (const mutation of FILES_TO_MUTATE) {
        const fullPath = path.resolve(mutation.path);
        const originalContent = fs.readFileSync(fullPath, 'utf8');

        if (!originalContent.includes(mutation.find)) {
            console.error(`❌ Could not find target content in ${mutation.path}: "${mutation.find}"`);
            continue;
        }

        console.log(`\n🔹 Applying mutation: ${mutation.description}`);
        const mutatedContent = originalContent.replace(mutation.find, mutation.replace);
        fs.writeFileSync(fullPath, mutatedContent);

        try {
            console.log(`🏃 Running tests for ${mutation.path}...`);
            const result = spawnSync('node', ['run_tests.js'], { stdio: 'pipe', encoding: 'utf8' });

            if (result.status === 0) {
                console.error(`🚨 CRITICAL FAILURE: Tests passed despite mutation: ${mutation.description}`);
                process.exit(1);
            } else {
                console.log(`✅ SUCCESS: Tests failed as expected for mutation: ${mutation.description}`);
            }
        } finally {
            // ALWAYS restore
            fs.writeFileSync(fullPath, originalContent);
            console.log(`♻️ Restored ${mutation.path}`);
        }
    }

    console.log('\n✨ Mutation Sanity Check completed successfully!');
}

runMutationTest();
