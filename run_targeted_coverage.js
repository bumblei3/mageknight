import { runner } from './tests/testRunner.js';
import './tests/setup.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testsDir = path.join(__dirname, 'tests');

console.log('Starting targeted coverage tests...');

// Dynamically import all test files
const files = fs.readdirSync(testsDir)
    .filter(file => file.endsWith('.test.js'));

for (const file of files) {
    await import(`./tests/${file}`);
}

runner.run();
