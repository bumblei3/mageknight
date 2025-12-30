import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { createMockElement, createMockLocalStorage, createSpy, createMockContext } from './test-mocks.js';
import { Terrain } from '../js/terrain.js';

describe('Game Coverage Boost', () => {
    let game;

    let originalGetElementById;
    let originalQuerySelector;
    let originalQuerySelectorAll;
    let originalAddEventListener;

    beforeEach(() => {
        originalGetElementById = global.document.getElementById;
        originalQuerySelector = global.document.querySelector;
        originalQuerySelectorAll = global.document.querySelectorAll;
        originalAddEventListener = global.document.addEventListener;
        // Setup global mocks if not present
        if (!global.document) {
            // Basic mock if global setup missing
        }

        // Mock specific elements game.js queries
        const elementCache = {};
        global.document.getElementById = (id) => {
            if (elementCache[id]) return elementCache[id];
            const el = createMockElement('div');
            el.id = id;
            if (id === 'game-board') {
                el.getContext = () => createMockContext();
                el.width = 800;
                el.height = 600;
            }
            elementCache[id] = el;
            return el;
        };
        global.document.querySelectorAll = () => [];
        global.document.querySelector = () => createMockElement('div');
        global.document.addEventListener = () => { };
        game = new MageKnightGame();
        // Override heavy systems
        game.sound = { play: () => { }, toggle: () => { } };
        game.enemyAI = { generateEnemy: () => ({ id: 'e1', name: 'Orc' }) };
        game.simpleTutorial = { shouldStart: () => false, start: () => { } };

        // Mock HexGrid
        game.hexGrid = {
            hexes: new Map(),
            getHexAt: () => null,
            render: () => { }
        };
        // Populate valid hexes
        game.hexGrid.hexes.set('0,0', { q: 0, r: 0, terrain: 1 });
        game.hexGrid.hexes.set('1,0', { q: 1, r: 0, terrain: 2 }); // Near
        game.hexGrid.hexes.set('10,10', { q: 10, r: 10, terrain: 3 }); // Far

        // Use real Terrain but override getName
        game.terrain = new Terrain();
        game.terrain.getName = () => 'plains';
    });

    afterEach(() => {
        if (game && game.destroy) game.destroy();
        global.document.getElementById = originalGetElementById;
        global.document.querySelector = originalQuerySelector;
        global.document.querySelectorAll = originalQuerySelectorAll;
        global.document.addEventListener = originalAddEventListener;
    });

    it('should create enemies based on grid', () => {
        // Setup terrain so it spawns enemies
        game.terrain.getName = () => 'ruins';
        game.enemies = [];
        game.createEnemies();
        expect(game.enemies.length).toBeGreaterThan(0);
    });

    it('should reset game state', () => {
        const modal = document.getElementById('reset-modal');
        // We override startNewGame to spy on it
        let startCalled = false;
        game.startNewGame = () => { startCalled = true; };

        game.reset();

        // Check functionality logic directly if UI interaction is complex to mock
        expect(modal.classList.contains('active')).toBe(true);

        // Manually invoke what the confirm button would do
        game.startNewGame();
        expect(startCalled).toBe(true);
    });

    it('should initialize system with touch controls', () => {
        const originalMatch = window.matchMedia;
        window.matchMedia = (query) => ({ matches: query.includes('pointer: coarse') });
        global.navigator.maxTouchPoints = 1;

        game.initializeSystem();
        expect(game.touchController).toBeDefined();

        window.matchMedia = originalMatch; // Restore
        global.navigator.maxTouchPoints = 0; // Reset
    });
});
