import './tests/setup.js';
import { runner } from './tests/testRunner.js';
import './tests/statistics.test.js';
import './tests/achievements.test.js';
import './tests/touchController.test.js';
import './tests/enemyAI.test.js';

// Run tests
console.log('Running new tests...');
runner.run().catch(e => console.error(e));
