
import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager } from '../../js/persistence/SaveManager.js';
import { migrateSave, SaveStateSchema } from '../../js/persistence/SaveSchema.js';
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

    describe('listSaves - corrupt index resilience', () => {
        it('returns empty array when index is not valid JSON', () => {
            global.localStorage.setItem('mk_save_index', 'not json at all');
            expect(SaveManager.listSaves()).toEqual([]);
        });

        it('returns empty array when index is a non-array JSON value', () => {
            global.localStorage.setItem('mk_save_index', JSON.stringify(123));
            expect(SaveManager.listSaves()).toEqual([]);
        });

        it('returns empty array when index key is missing', () => {
            expect(SaveManager.listSaves()).toEqual([]);
        });
    });

    describe('hasSave - corrupt index resilience', () => {
        it('does not throw when index is not valid JSON', () => {
            global.localStorage.setItem('mk_save_index', 'garbage');
            expect(() => SaveManager.hasSave('0')).not.toThrow();
            expect(SaveManager.hasSave('0')).toBe(false);
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

    describe('migrateV0toV1 edge cases (branch coverage)', () => {
        it('should handle null hero', () => {
            const v0 = { hero: null, enemies: [], timestamp: 1000 };
            const migrated = migrateSave(v0);
            expect(migrated.hero).toBeNull();
        });

        it('should handle undefined hero', () => {
            const v0 = { enemies: [], timestamp: 1000 };
            delete v0.hero;
            const migrated = migrateSave(v0);
            expect(migrated.hero).toBeNull();
        });

        it('should handle non-array enemies', () => {
            const v0 = { hero: { name: 'Test' }, enemies: 'not-array', timestamp: 1000 };
            const migrated = migrateSave(v0);
            expect(migrated.enemies).toEqual([]);
        });

        it('should filter null enemy items', () => {
            const v0 = { 
                hero: { name: 'Test' }, 
                enemies: [{ name: 'Valid' }, null, { type: 'invalid' }, { name: 'Also Valid' }], 
                timestamp: 1000 
            };
            const migrated = migrateSave(v0);
            // Null should be filtered out, invalid object should get defaults
            expect(migrated.enemies.length).toBeGreaterThanOrEqual(2);
        });

        it('should handle missing combat', () => {
            const v0 = { hero: { name: 'Test' }, enemies: [], timestamp: 1000 };
            delete v0.combat;
            const migrated = migrateSave(v0);
            expect(migrated.combat).toBeNull();
        });

        it('should handle missing hexGrid', () => {
            const v0 = { hero: { name: 'Test' }, enemies: [], timestamp: 1000 };
            delete v0.hexGrid;
            const migrated = migrateSave(v0);
            expect(migrated.hexGrid).toBeNull();
        });

        it('should handle missing time', () => {
            const v0 = { hero: { name: 'Test' }, enemies: [], timestamp: 1000 };
            delete v0.time;
            const migrated = migrateSave(v0);
            expect(migrated.time).toEqual({ round: 1, timeOfDay: 'day' });
        });

        it('should handle missing statistics', () => {
            const v0 = { hero: { name: 'Test' }, enemies: [], timestamp: 1000 };
            delete v0.statistics;
            const migrated = migrateSave(v0);
            expect(migrated.statistics).toEqual({});
        });

        it('should handle missing achievements', () => {
            const v0 = { hero: { name: 'Test' }, enemies: [], timestamp: 1000 };
            delete v0.achievements;
            const migrated = migrateSave(v0);
            expect(migrated.achievements).toEqual({ unlocked: [] });
        });

        it('should handle achievements without unlocked array', () => {
            const v0 = { hero: { name: 'Test' }, enemies: [], achievements: {}, timestamp: 1000 };
            const migrated = migrateSave(v0);
            expect(migrated.achievements).toEqual({ unlocked: [] });
        });

        it('should handle missing turn', () => {
            const v0 = { hero: { name: 'Test' }, enemies: [], timestamp: 1000 };
            delete v0.turn;
            const migrated = migrateSave(v0);
            expect(migrated.turn).toBeNull();
        });

        it('should handle timeOfDay not day/night', () => {
            const v0 = { hero: { name: 'Test' }, enemies: [], time: { timeOfDay: 'twilight' }, timestamp: 1000 };
            const migrated = migrateSave(v0);
            expect(migrated.time.timeOfDay).toBe('day');
        });

        it('should handle enemy with missing fields getting defaults', () => {
            const v0 = {
                hero: { name: 'Test' },
                enemies: [{ id: 'e1' }], // Minimal enemy
                timestamp: 1000
            };
            const migrated = migrateSave(v0);
            expect(migrated.enemies[0].id).toBe('e1');
            expect(migrated.enemies[0].type).toBe('unknown');
            expect(migrated.enemies[0].name).toBe('Unknown Enemy');
            expect(migrated.enemies[0].armor).toBe(0);
            expect(migrated.enemies[0].attack).toBe(0);
            expect(migrated.enemies[0].fame).toBe(0);
        });

        it('should handle v0 save without version field', () => {
            const v0 = { hero: { name: 'Test' }, enemies: [], timestamp: 1000 };
            delete v0.version;
            const migrated = migrateSave(v0);
            expect(migrated.version).toBe(1);
        });

        it('should throw on completely invalid save data', () => {
            expect(() => migrateSave(null)).toThrow('Invalid save data: not an object');
            expect(() => migrateSave('not an object')).toThrow('Invalid save data: not an object');
            expect(() => migrateSave(123)).toThrow('Invalid save data: not an object');
        });

        it('should throw on unsupported version', () => {
            const v2 = { version: 2, hero: { name: 'Test' }, enemies: [], timestamp: 1000 };
            expect(() => migrateSave(v2)).toThrow('Unsupported save version: 2');
        });
    });
});
