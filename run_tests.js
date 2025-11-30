import { runner } from './tests/testRunner.js';

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

console.log('Starting tests...');
runner.run();
