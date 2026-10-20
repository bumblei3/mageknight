/**
 * Saves used to be dropped silently as soon as the hero's reputation went
 * negative: `HeroStateSchema.reputation` was `z.number().min(0)` while the
 * engine clamps reputation to [-7, 7] (`Hero.changeReputation`) and cards such
 * as Threaten cost 1 reputation. `SaveManager.saveGame` returns false on a
 * validation error and only writes console.error, so the player lost the run.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager } from '../../js/persistence/SaveManager.js';
import { validateSave } from '../../js/persistence/SaveSchema.js';

const baseState = (overrides = {}) => ({
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
        units: []
    },
    enemies: [],
    combat: null,
    hexGrid: null,
    time: { round: 1, timeOfDay: 'day' },
    statistics: {},
    achievements: { unlocked: [] },
    turn: null,
    timestamp: Date.now(),
    ...overrides
});

const withReputation = (reputation) => {
    const state = baseState();
    state.hero.reputation = reputation;
    return state;
};

describe('saving a game with negative reputation', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('accepts the reputation range the engine can produce', () => {
        for (const reputation of [-7, -3, -1, 0, 3, 7]) {
            const result = validateSave(withReputation(reputation));
            expect(result.success, `reputation ${reputation} should validate`).toBe(true);
        }
    });

    it('still rejects numbers outside the engine range', () => {
        expect(validateSave(withReputation(-8)).success).toBe(false);
        expect(validateSave(withReputation(8)).success).toBe(false);
    });

    it('writes the save to localStorage when reputation is negative', () => {
        const success = SaveManager.saveGame('slot_negative_rep', withReputation(-2));

        expect(success).toBe(true);
        expect(localStorage.getItem('slot_negative_rep')).toContain('"reputation":-2');
    });

    it('keeps the reputation value through save and load', () => {
        SaveManager.saveGame('slot_roundtrip', withReputation(-4));

        const loaded = SaveManager.loadGame('slot_roundtrip');

        expect(loaded).not.toBeNull();
        expect(loaded.hero.reputation).toBe(-4);
    });
});

describe('extra turns survive a save/load round trip', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('stores the pending extra turns from Time Walk', () => {
        const state = baseState();
        state.hero.extraTurns = 2;

        const result = validateSave(state);

        expect(result.success).toBe(true);
        expect(result.data.hero.extraTurns).toBe(2);
    });

    it('defaults missing extra turns to zero', () => {
        const result = validateSave(baseState());

        expect(result.success).toBe(true);
        expect(result.data.hero.extraTurns).toBe(0);
    });
});
