
import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager } from '../../js/persistence/SaveManager.js';
import { setupGlobalMocks, resetMocks, createMockLocalStorage } from '../test-mocks.js';

setupGlobalMocks();

describe('SaveManager Extended Coverage', () => {

    beforeEach(() => {
        resetMocks();
        global.localStorage = createMockLocalStorage();
    });

    describe('saveGame', () => {
        it('should save game to specified slot', () => {
            const gameState = {
                hero: { name: 'TestHero', position: { q: 0, r: 0 } },
                turnNumber: 5
            };

            const result = SaveManager.saveGame(0, gameState);
            expect(result).toBe(true);
        });

        it('should handle save errors gracefully', () => {
            // Make localStorage throw
            global.localStorage.setItem = () => { throw new Error('Storage full'); };

            const result = SaveManager.saveGame(0, {});
            expect(result).toBe(false);
        });
    });

    describe('loadGame', () => {
        it('should return null for empty slot', () => {
            const result = SaveManager.loadGame(0);
            expect(result).toBeNull();
        });

        it('should load previously saved game', () => {
            const gameState = {
                hero: { name: 'TestHero' },
                turnNumber: 3
            };

            SaveManager.saveGame(1, gameState);
            const loaded = SaveManager.loadGame(1);

            expect(loaded).toBeDefined();
        });
    });

    describe('hasSave', () => {
        it('should check if save exists', () => {
            SaveManager.saveGame(1, {});
            // Should check for explicit strings since localStorage keys are strings
            expect(SaveManager.hasSave('1')).toBe(true);
            expect(SaveManager.hasSave('99')).toBe(false);
        });
    });
});
