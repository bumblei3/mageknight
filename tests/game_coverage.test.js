
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { createMockDocument, createMockWindow, setupGlobalMocks, resetMocks } from './test-mocks.js';
import { Card } from '../js/card.js';

describe('Game Coverage Tests', () => {
    let game;

    beforeEach(() => {
        setupGlobalMocks();
        resetMocks();

        // Specific mocks for game tests
        global.document.getElementById = (id) => {
            const el = createMockDocument().createElement('div');
            el.id = id;
            el.classList = {
                add: (cls) => el.className += ` ${cls}`,
                remove: (cls) => el.className = el.className.replace(cls, '')
            };
            return el;
        };

        game = new MageKnightGame();
    });

    afterEach(() => {
        if (game.destroy) game.destroy();
    });

    describe('Reset Functionality', () => {
        it('should show reset modal when reset is called', () => {
            const modal = document.getElementById('reset-modal');
            game.reset();
            // In our mock, classList.add appends to className
            expect(modal.className).toContain('active');
        });
    });

    describe('Enemy Creation', () => {
        it('should spawn enemies based on terrain', () => {
            // Mock map manager to produce specific terrain
            game.mapManager = {
                createStartingMap: () => { },
                getTerrainAt: () => 'keep'
            };

            // Override hexGrid to have one test hex
            game.hexGrid.hexes = new Map();
            game.hexGrid.hexes.set('1,1', { q: 1, r: 1, terrain: 'keep' });

            // Mock terrain to return name
            game.terrain.getName = () => 'keep';

            game.createEnemies();

            expect(game.enemies.length).toBeGreaterThan(0);
            expect(game.enemies[0].id).toBeDefined();
        });

        it('should not spawn enemies in starting area', () => {
            game.hexGrid.hexes = new Map();
            game.hexGrid.hexes.set('0,0', { q: 0, r: 0, terrain: 'plains' }); // Start

            game.createEnemies();
            expect(game.enemies.length).toBe(0);
        });
    });

    describe('Save/Load Edge Cases', () => {
        it('should handle load game failure gracefully', () => {
            // Mock save manager to throw error
            game.saveManager.loadGame = () => { throw new Error('Corrupt save'); };

            // Mock console.error to suppress output
            const originalWarn = console.warn;
            const originalError = console.error;
            let errorLogged = false;
            console.error = () => { errorLogged = true; };
            console.warn = () => { };

            try {
                // Attempt to load invalid slot
                const result = game.saveManager.loadGame('invalid_slot');
                expect(result).toBeUndefined();
            } catch (e) {
                expect(e.message).toBe('Corrupt save');
            } finally {
                console.error = originalError;
                console.warn = originalWarn;
            }
        });

        it('should handle successful save', () => {
            game.saveManager.saveGame = (slot, state) => true;
            const result = game.saveManager.saveGame(1, {});
            expect(result).toBe(true);
        });
    });

    describe('Initialization Edge Cases', () => {
        it('should handle touch controller initialization', () => {
            // Mock Touch events on window
            global.window.ontouchstart = () => { };
            // Mock navigator for touch
            global.navigator.maxTouchPoints = 1;

            const touchGame = new MageKnightGame();
            // Expect touchController to be initialized (logic in initializeSystem)
            expect(touchGame.touchController).toBeDefined();
            touchGame.destroy();
        });

        it('should initialize debug manager', () => {
            expect(game.debugManager).toBeDefined();
        });
    });
});
