import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager } from '../js/persistence/SaveManager.js';
import { Unit } from '../js/unit.js';

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

describe('Persistence System', () => {

    beforeEach(() => {
        localStorage.clear();
    });

    describe('SaveManager', () => {
        it('should save data to localStorage', () => {
            const data = createValidSaveState({ timestamp: 12345 });
            const success = SaveManager.saveGame('test', data);
            expect(success).toBe(true);

            const raw = localStorage.getItem('test');
            expect(raw).toBeTruthy();
            const parsed = JSON.parse(raw);
            expect(parsed.timestamp).toBe(12345);
        });

        it('should load data from localStorage', () => {
            const data = createValidSaveState({ timestamp: 12345 });
            SaveManager.saveGame('test', data);

            const loaded = SaveManager.loadGame('test');
            expect(loaded.timestamp).toBe(12345);
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