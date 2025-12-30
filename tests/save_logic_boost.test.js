import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { SaveManager } from '../js/saveManager.js';
import { createMockLocalStorage, createSpy } from './test-mocks.js';

describe('Save Manager Logic Boost', () => {
    let sm;

    beforeEach(() => {
        global.localStorage = createMockLocalStorage();
        sm = new SaveManager();
    });

    it('should list empty saves correctly', () => {
        const list = sm.listSaves();
        expect(list.length).toBe(5);
        expect(list[0].empty).toBe(true);
    });

    it('should handle version mismatch in loadGame', () => {
        const state = { turn: 1, hero: { name: 'Test' }, enemies: [], manaSource: {} };
        sm.saveGame(0, state);

        // Modify version manually in localStorage
        const saves = JSON.parse(localStorage.getItem(sm.storageKey));
        saves[0].version = '2.0';
        localStorage.setItem(sm.storageKey, JSON.stringify(saves));

        const consoleSpy = createSpy();
        const originalWarn = console.warn;
        console.warn = consoleSpy;

        const loaded = sm.loadGame(0);
        expect(consoleSpy.calledWith('Save version mismatch')).toBe(true);
        expect(loaded).toBeDefined(); // Still returns state even if version mismatch

        console.warn = originalWarn;
    });

    it('should handle missing metadata in listSaves', () => {
        const minimalState = { hero: {} }; // Missing turn, fame, name
        sm.saveGame(1, minimalState);

        const list = sm.listSaves();
        const slot1 = list[1];
        expect(slot1.turn).toBe(0);
        expect(slot1.heroName).toBe('Unknown');
        expect(slot1.fame).toBe(0);
    });

    it('should handle autoSave presence', () => {
        expect(sm.hasAutoSave()).toBe(false);
        sm.autoSave({ hero: {}, enemies: [], manaSource: {} });
        expect(sm.hasAutoSave()).toBe(true);
    });

    it('should clear all saves', () => {
        sm.saveGame(0, { hero: {} });
        sm.autoSave({ hero: {} });
        expect(sm.getAllSaves()[0]).toBeDefined();

        sm.clearAllSaves();
        expect(sm.getAllSaves()).toEqual({});
        expect(sm.hasAutoSave()).toBe(false);
    });

    it('should handle serialization defaults', () => {
        // Test with missing properties to trigger || defaults
        const state = {
            hero: { name: 'Arythea' },
            enemies: [],
            manaSource: {}
        };
        const serialized = sm.serializeGameState(state);
        expect(serialized.turn).toBe(0);
        expect(serialized.movementMode).toBe(false);
        expect(serialized.selectedHex).toBe(null);
    });
});
