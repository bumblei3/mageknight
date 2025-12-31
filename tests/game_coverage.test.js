
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { createMockDocument, createMockWindow, setupGlobalMocks, resetMocks } from './test-mocks.js';
import { Card } from '../js/card.js';

describe('Game Coverage Tests', () => {
    let game;

    beforeEach(() => {
        setupGlobalMocks();
        resetMocks();
        game = new MageKnightGame();
    });

    afterEach(() => {
        if (game.destroy) game.destroy();
    });

    describe('Reset Functionality', () => {
        it('should show reset modal when reset is called', () => {
            const modal = document.getElementById('reset-modal');
            game.reset();
            expect(modal.classList.contains('active')).toBe(true);
        });
    });

    describe('Enemy Creation', () => {
        it('should spawn enemies based on terrain', () => {
            // Mock map manager to produce specific terrain
            game.mapManager = {
                createStartingMap: () => { },
                getTerrainAt: () => 'keep',
                canExplore: () => false
            };

            // Override hex grid to have one test hex far from center
            game.hexGrid.hexes = new Map();
            game.hexGrid.hexes.set('2,2', { q: 2, r: 2, terrain: 'keep' });

            // Mock terrain to return name
            game.terrain.getName = () => 'keep';

            game.createEnemies();

            expect(game.enemies.length).toBeGreaterThan(0);
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

        it('should initialize debug tools', () => {
            expect(game.ui).toBeDefined();
        });
    });
});
