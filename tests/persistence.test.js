import { describe, it, expect, beforeEach } from './testRunner.js';
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

            const raw = localStorage.getItem('mageknight_save_test');
            expect(raw).toBeTruthy(); // Using truthy check as existing mock might return string
            const parsed = JSON.parse(raw);
            expect(parsed.state).toEqual(data);
            expect(parsed.version).toBe('1.0');
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

        it('should get save metadata', () => {
            const data = { level: 5 };
            SaveManager.saveGame('meta_test', data);

            const meta = SaveManager.getSaveMeta('meta_test');
            expect(meta).not.toBeNull();
            expect(meta.timestamp).toBeDefined();
            expect(meta.version).toBe('1.0');
        });
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
