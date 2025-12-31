import { runner } from './tests/testRunner.js';
import './tests/setup.js';
import { resetMocks } from './tests/test-mocks.js';
import { afterEach } from './tests/testRunner.js';

// Register global cleanup hook
afterEach(() => {
    resetMocks();
    // Clear any global listeners that might have been added on document/window manually
    if (global.document && global.document._listeners) {
        global.document._listeners.clear();
    }
    if (global.window && global.window._listeners) {
        global.window._listeners.clear();
    }
});

// Only core tests for coverage analysis
import './tests/game.test.js';
import './tests/game_logic.test.js';
import './tests/ui.test.js';
import './tests/achievements.test.js';
import './tests/game_boost_final.test.js';
import './tests/game_logic_boost.test.js';
import './tests/game_ui_boost.test.js';
import './tests/ui_boost.test.js';
import './tests/coverage_boost_v3.test.js';
import './tests/coverage_final_boost.test.js';
import './tests/coverage_gap_fill.test.js';

console.log('Starting targeted coverage tests...');
runner.run();
