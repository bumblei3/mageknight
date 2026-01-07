import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager } from '../js/persistence/SaveManager.js';
import { Unit } from '../js/unit.js';

describe('Persistence System', () => {

    beforeEach(() => {
        // localStorage is mocked globally by setup.js
        localStorage.clear();
    });

    describe('SaveManager', () => {
        it('should save data to localStorage', () => {
            const data = { foo: 'bar' };
            const success = SaveManager.saveGame('test', data);
            expect(success).toBe(true);

            // SaveManager.ts uses key directly
            const raw = localStorage.getItem('test');
            expect(raw).toBeTruthy();
            const parsed = JSON.parse(raw);
            expect(parsed).toEqual(data);
        });

        it('should load data from localStorage', () => {
            const data = { foo: 'bar' };
            SaveManager.saveGame('test', data);

            const loaded = SaveManager.loadGame('test');
            expect(loaded).toEqual(data);
        });

        it('should return null if save does not exist', () => {
            const loaded = SaveManager.loadGame('nonexistent');
            expect(loaded).toBeNull();
        });

        // getSaveMeta does not exist in current SaveManager.ts
        // Skipping or removing it.
        // If metadata is needed, it should be part of the 'state' object passed to saveGame.

    });

    describe('Unit Serialization', () => {
        it('should serialize and deserialize a Unit', () => {
            const unit = new Unit('peasants');
            unit.takeWound(); // Modify state
            unit.ready = false;

            const state = unit.getState();
            expect(state.type).toBe('peasants');
            expect(state.wounds).toBe(1);
            expect(state.ready).toBe(false);

            const newUnit = Unit.fromState(state);
            expect(newUnit.type).toBe('peasants');
            expect(newUnit.wounds).toBe(1);
            expect(newUnit.ready).toBe(false);
            // Check immutable info restored
            expect(newUnit.getArmor()).toBe(3);
        });
    });
});
