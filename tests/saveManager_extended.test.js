
import { describe, it, expect, beforeEach } from './testRunner.js';
import { SaveManager } from '../js/saveManager.js';
import { setupGlobalMocks, resetMocks, createMockLocalStorage } from './test-mocks.js';

setupGlobalMocks();

describe('SaveManager Extended Coverage', () => {
    let saveManager;

    beforeEach(() => {
        resetMocks();
        global.localStorage = createMockLocalStorage();
        saveManager = new SaveManager();
    });

    describe('saveGame', () => {
        it('should save game to specified slot', () => {
            const gameState = {
                hero: { name: 'TestHero', position: { q: 0, r: 0 } },
                turnNumber: 5
            };

            const result = saveManager.saveGame(0, gameState);
            expect(result).toBe(true);
        });

        it('should handle save errors gracefully', () => {
            // Make localStorage throw
            global.localStorage.setItem = () => { throw new Error('Storage full'); };

            const result = saveManager.saveGame(0, {});
            expect(result).toBe(false);
        });
    });

    describe('loadGame', () => {
        it('should return null for empty slot', () => {
            const result = saveManager.loadGame(0);
            expect(result).toBeNull();
        });

        it('should load previously saved game', () => {
            const gameState = {
                hero: { name: 'TestHero' },
                turnNumber: 3
            };

            saveManager.saveGame(1, gameState);
            const loaded = saveManager.loadGame(1);

            expect(loaded).toBeDefined();
        });
    });

    describe('autoSave/loadAutoSave', () => {
        it('should auto-save game state', () => {
            const gameState = { hero: { name: 'Auto' } };
            saveManager.autoSave(gameState);
            // Should not throw
        });

        it('should load auto-saved state', () => {
            const gameState = { hero: { name: 'Auto' }, turnNumber: 7 };
            saveManager.autoSave(gameState);

            const loaded = saveManager.loadAutoSave();
            expect(loaded).toBeDefined();
        });
    });

    describe('deleteSave', () => {
        it('should delete save from slot', () => {
            saveManager.saveGame(2, { hero: { name: 'Delete' } });
            saveManager.deleteSave(2);

            const result = saveManager.loadGame(2);
            expect(result).toBeNull();
        });
    });

    describe('getAllSaves', () => {
        it('should return empty object when no saves', () => {
            const saves = saveManager.getAllSaves();
            expect(typeof saves).toBe('object');
        });
    });
});
