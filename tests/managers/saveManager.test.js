import { describe, it, expect, beforeEach } from '../testRunner.js';
import { SaveManager } from '../../js/persistence/SaveManager.js';

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

if (typeof localStorage === 'undefined') {
    global.localStorage = mockLocalStorage;
}

describe('SaveManager', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should save game state to slot', () => {
        const gameState = {
            turn: 5,
            hero: { name: 'TestHero', level: 3 }
        };

        const result = SaveManager.saveGame('0', gameState);
        expect(result).toBe(true);
    });

    it('should load saved game state from slot', () => {
        const gameState = {
            turn: 5,
            hero: { name: 'TestHero', level: 3 }
        };

        SaveManager.saveGame('1', gameState);
        const loaded = SaveManager.loadGame('1');

        expect(loaded).toBeDefined();
        expect(loaded.hero.name).toBe('TestHero');
        expect(loaded.hero.level).toBe(3);
        expect(loaded.turn).toBe(5);
    });

    it('should return null for non-existent save slot', () => {
        const loaded = SaveManager.loadGame('3');
        expect(loaded).toBeNull();
    });

    // Removed listSaves, deleteSave, autoSave specific tests as they were legacy features
    // not explicitly in the new static facade or worked differently.
    // The new SaveManager focuses on raw save/load.

    it('should handle autosave via slot id', () => {
        const gameState = { turn: 7 };
        SaveManager.saveGame('auto', gameState);

        const loaded = SaveManager.loadGame('auto');
        expect(loaded).toBeDefined();
        expect(loaded.turn).toBe(7);
    });

    it('should check if save exists', () => {
        const gameState = { turn: 1 };
        SaveManager.saveGame('check', gameState);
        expect(SaveManager.hasSave('check')).toBe(true);
        expect(SaveManager.hasSave('nonexistent')).toBe(false);
    });
});
