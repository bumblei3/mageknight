import { runner } from './tests/testRunner.js';
import './tests/setup.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testsDir = path.join(__dirname, 'tests');

console.log('Starting targeted coverage tests...');

// Force garbage collection if available
function maybeGC() {
    if (global.gc) {
        global.gc();
    }
}

// Dynamically import all test files with GC between batches
const files = fs.readdirSync(testsDir)
    .filter(file => file.endsWith('.test.js'));

let count = 0;
for (const file of files) {
    await import(`./tests/${file}`);
    count++;

    // Run GC every 10 test files to keep memory down
    if (count % 10 === 0) {
        maybeGC();
    }
}

// Final GC before running tests
maybeGC();

runner.run();
