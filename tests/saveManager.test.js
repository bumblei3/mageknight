import { describe, it, expect, beforeEach } from './testRunner.js';
import { SaveManager } from '../js/saveManager.js';

// Mock localStorage for Node.js environment
const mockLocalStorage = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();

// Use mock if localStorage is not available
if (typeof localStorage === 'undefined') {
    global.localStorage = mockLocalStorage;
}

describe('SaveManager', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should save game state to slot', () => {
        const saveManager = new SaveManager();
        const gameState = {
            turn: 5,
            hero: { name: 'TestHero', level: 3, fame: 50, position: { q: 0, r: 0 }, deck: [], hand: [], discard: [], wounds: [], crystals: {}, movementPoints: 0, attackPoints: 0, blockPoints: 0, influencePoints: 0, healingPoints: 0, armor: 2, handLimit: 5, reputation: 0 },
            enemies: [],
            manaSource: { dice: [] },
            terrain: {},
            selectedHex: null,
            movementMode: false
        };

        const result = saveManager.saveGame(0, gameState);

        expect(result).toBe(true);
    });

    it('should load saved game state from slot', () => {
        const saveManager = new SaveManager();
        const gameState = {
            turn: 5,
            hero: { name: 'TestHero', level: 3, fame: 50, position: { q: 0, r: 0 }, deck: [], hand: [], discard: [], wounds: [], crystals: {}, movementPoints: 0, attackPoints: 0, blockPoints: 0, influencePoints: 0, healingPoints: 0, armor: 2, handLimit: 5, reputation: 0 },
            enemies: [],
            manaSource: { dice: [] },
            terrain: {},
            selectedHex: null,
            movementMode: false
        };

        saveManager.saveGame(1, gameState);
        const loaded = saveManager.loadGame(1);

        expect(loaded).toBeDefined();
        expect(loaded.hero.name).toBe('TestHero');
        expect(loaded.hero.level).toBe(3);
        expect(loaded.turn).toBe(5);
    });

    it('should return null for non-existent save slot', () => {
        const saveManager = new SaveManager();

        const loaded = saveManager.loadGame(3);

        expect(loaded).toBeNull();
    });

    it('should list all save slots with metadata', () => {
        const saveManager = new SaveManager();
        const gameState = {
            turn: 2,
            hero: { name: 'Hero1', level: 1, fame: 10, position: { q: 0, r: 0 }, deck: [], hand: [], discard: [], wounds: [], crystals: {}, movementPoints: 0, attackPoints: 0, blockPoints: 0, influencePoints: 0, healingPoints: 0, armor: 2, handLimit: 5, reputation: 0 },
            enemies: [],
            manaSource: { dice: [] },
            terrain: {}
        };

        saveManager.saveGame(0, gameState);
        const saves = saveManager.listSaves();

        expect(saves).toHaveLength(5); // maxSlots
        expect(saves[0].empty).toBeUndefined();
        expect(saves[0].heroName).toBe('Hero1');
        expect(saves[1].empty).toBe(true);
    });

    it('should delete save slot', () => {
        const saveManager = new SaveManager();
        const gameState = {
            turn: 3,
            hero: { name: 'DeleteMe', level: 2, fame: 20, position: { q: 0, r: 0 }, deck: [], hand: [], discard: [], wounds: [], crystals: {}, movementPoints: 0, attackPoints: 0, blockPoints: 0, influencePoints: 0, healingPoints: 0, armor: 2, handLimit: 5, reputation: 0 },
            enemies: [],
            manaSource: { dice: [] },
            terrain: {}
        };

        saveManager.saveGame(2, gameState);
        const deleted = saveManager.deleteSave(2);

        expect(deleted).toBe(true);

        const loaded = saveManager.loadGame(2);
        expect(loaded).toBeNull();
    });

    it('should handle autosave', () => {
        const saveManager = new SaveManager();
        const gameState = {
            turn: 7,
            hero: { name: 'AutoHero', level: 4, fame: 80, position: { q: 1, r: 1 }, deck: [], hand: [], discard: [], wounds: [], crystals: {}, movementPoints: 0, attackPoints: 0, blockPoints: 0, influencePoints: 0, healingPoints: 0, armor: 2, handLimit: 5, reputation: 0 },
            enemies: [],
            manaSource: { dice: [] },
            terrain: {}
        };

        saveManager.autoSave(gameState);

        const hasAutoSave = saveManager.hasAutoSave();
        expect(hasAutoSave).toBe(true);

        const loaded = saveManager.loadAutoSave();
        expect(loaded).toBeDefined();
        expect(loaded.hero.name).toBe('AutoHero');
        expect(loaded.turn).toBe(7);
    });

    it('should handle multiple saves in different slots', () => {
        const saveManager = new SaveManager();

        for (let i = 0; i < 3; i++) {
            const gameState = {
                turn: i + 1,
                hero: { name: `Hero${i}`, level: i + 1, fame: i * 10, position: { q: 0, r: 0 }, deck: [], hand: [], discard: [], wounds: [], crystals: {}, movementPoints: 0, attackPoints: 0, blockPoints: 0, influencePoints: 0, healingPoints: 0, armor: 2, handLimit: 5, reputation: 0 },
                enemies: [],
                manaSource: { dice: [] },
                terrain: {}
            };
            saveManager.saveGame(i, gameState);
        }

        const loaded0 = saveManager.loadGame(0);
        const loaded1 = saveManager.loadGame(1);
        const loaded2 = saveManager.loadGame(2);

        expect(loaded0.hero.name).toBe('Hero0');
        expect(loaded1.hero.name).toBe('Hero1');
        expect(loaded2.hero.name).toBe('Hero2');
    });

    it('should clear all saves', () => {
        const saveManager = new SaveManager();
        const gameState = {
            turn: 1,
            hero: { name: 'ClearTest', level: 1, fame: 0, position: { q: 0, r: 0 }, deck: [], hand: [], discard: [], wounds: [], crystals: {}, movementPoints: 0, attackPoints: 0, blockPoints: 0, influencePoints: 0, healingPoints: 0, armor: 2, handLimit: 5, reputation: 0 },
            enemies: [],
            manaSource: { dice: [] },
            terrain: {}
        };

        saveManager.saveGame(0, gameState);
        saveManager.autoSave(gameState);

        saveManager.clearAllSaves();

        expect(saveManager.loadGame(0)).toBeNull();
        expect(saveManager.loadAutoSave()).toBeNull();
        expect(saveManager.hasAutoSave()).toBe(false);
    });
});
