
import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager } from '../../js/persistence/SaveManager.js';
import { setupGlobalMocks, resetMocks, createMockLocalStorage } from '../test-mocks.js';

setupGlobalMocks();

// Helper to create minimal valid save state
const createValidSaveState = (overrides = {}) => ({
    version: 1,
    hero: {
        name: 'TestHero',
        level: 1,
        fame: 0,
        reputation: 0,
        armor: 0,
        movementPoints: 0,
        attackPoints: 0,
        blockPoints: 0,
        influencePoints: 0,
        healingPoints: 0,
        handLimit: 5,
        commandLimit: 0,
        position: { q: 0, r: 0 },
        deck: [],
        hand: [],
        discard: [],
        wounds: [],
        crystals: {},
        skills: [],
        tempMana: [],
        units: [],
    },
    enemies: [],
    combat: null,
    hexGrid: null,
    time: { round: 1, timeOfDay: 'day' },
    statistics: {},
    achievements: { unlocked: [] },
    turn: null,
    timestamp: Date.now(),
    ...overrides,
});

describe('SaveManager Extended Coverage', () => {

    beforeEach(() => {
        resetMocks();
        global.localStorage = createMockLocalStorage();
    });

    describe('saveGame', () => {
        it('should save game to specified slot', () => {
            const gameState = createValidSaveState({
                hero: { ...createValidSaveState().hero, name: 'TestHero', position: { q: 0, r: 0 } },
                turnNumber: 5
            });

            const result = SaveManager.saveGame(0, gameState);
            expect(result).toBe(true);
        });

        it('should handle save errors gracefully', () => {
            // Make localStorage throw
            global.localStorage.setItem = () => { throw new Error('Storage full'); };

            const result = SaveManager.saveGame(0, createValidSaveState());
            expect(result).toBe(false);
        });
    });

    describe('loadGame', () => {
        it('should return null for empty slot', () => {
            const result = SaveManager.loadGame(0);
            expect(result).toBeNull();
        });

        it('should load previously saved game', () => {
            const gameState = createValidSaveState({
                hero: { ...createValidSaveState().hero, name: 'TestHero' },
                turnNumber: 3
            });

            SaveManager.saveGame(1, gameState);
            const loaded = SaveManager.loadGame(1);

            expect(loaded).toBeDefined();
        });
    });

    describe('hasSave', () => {
        it('should check if save exists', () => {
            SaveManager.saveGame(1, createValidSaveState());
            expect(SaveManager.hasSave('1')).toBe(true);
            expect(SaveManager.hasSave('99')).toBe(false);
        });
    });

    describe('deleteSave', () => {
        it('should delete a save slot', () => {
            SaveManager.saveGame(1, createValidSaveState());
            expect(SaveManager.hasSave('1')).toBe(true);

            SaveManager.deleteSave(1);
            expect(SaveManager.hasSave('1')).toBe(false);
        });

        it('should remove from index when deleted', () => {
            SaveManager.saveGame(1, createValidSaveState());
            SaveManager.saveGame(2, createValidSaveState());
            expect(SaveManager.listSaves().length).toBe(2);

            SaveManager.deleteSave(1);
            const saves = SaveManager.listSaves();
            expect(saves.length).toBe(1);
            expect(saves).not.toContain('1');
        });

        it('should handle deleting non-existent save', () => {
            expect(() => SaveManager.deleteSave(999)).not.toThrow();
        });
    });

    describe('listSaves', () => {
        it('should return empty array when no saves', () => {
            expect(SaveManager.listSaves()).toEqual([]);
        });

        it('should list all saved slots', () => {
            SaveManager.saveGame('slot1', createValidSaveState());
            SaveManager.saveGame('slot2', createValidSaveState());
            const saves = SaveManager.listSaves();
            expect(saves.length).toBe(2);
            expect(saves).toContain('slot1');
            expect(saves).toContain('slot2');
        });
    });

    describe('loadGame edge cases', () => {
        it('should return null for corrupted JSON', () => {
            global.localStorage.setItem('corrupt', 'not valid json');
            const result = SaveManager.loadGame('corrupt');
            expect(result).toBeNull();
        });

        it('should handle non-string slot keys', () => {
            SaveManager.saveGame(5, createValidSaveState({ hero: { ...createValidSaveState().hero, name: 'TestHero5' } }));
            const result = SaveManager.loadGame(5);
            expect(result).toBeDefined();
            expect(result.hero.name).toBe('TestHero5');
        });
    });

    describe('saveGame edge cases', () => {
        it('should handle circular reference in state', () => {
            const circular = { a: 1 };
            circular.self = circular;

            const result = SaveManager.saveGame('circular', circular);
            expect(result).toBe(false);
        });

        it('should overwrite existing save', () => {
            const firstSave = createValidSaveState({ timestamp: 1000 });
            SaveManager.saveGame('slot', firstSave);
            const secondSave = createValidSaveState({ timestamp: 2000 });
            SaveManager.saveGame('slot', secondSave);

            const loaded = SaveManager.loadGame('slot');
            expect(loaded.timestamp).toBe(2000);
        });
    });
});
