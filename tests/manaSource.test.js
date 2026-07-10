import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    ManaSource,
    CrystalStorage,
    MANA_COLORS,
} from '../js/mana.js';

/**
 * Focused tests for js/mana.ts (ManaSource + CrystalStorage).
 * Previously at ~67% line coverage; the gaps were RNG-driven branches
 * (ensureBasicColors), edge cases (invalid die index, null loadState) and
 * the card-counting / crystal-storage logic.
 *
 * ManaSource.dice and usedDice are public, so we drive deterministic scenarios
 * by setting them directly rather than relying on Math.random.
 */

const BASIC = [MANA_COLORS.RED, MANA_COLORS.BLUE, MANA_COLORS.WHITE, MANA_COLORS.GREEN];

describe('ManaSource - construction & dice', () => {
    it('initializes with playerCount + 2 dice', () => {
        expect(new ManaSource(1).dice.length).toBe(3);
        expect(new ManaSource(2).dice.length).toBe(4);
        expect(new ManaSource(4).dice.length).toBe(6);
    });

    it('default playerCount is 1', () => {
        expect(new ManaSource().dice.length).toBe(3);
    });

    it('rollDie returns a valid mana color', () => {
        const src = new ManaSource(1);
        const valid = Object.values(MANA_COLORS);
        for (let i = 0; i < 50; i++) {
            expect(valid).toContain(src.rollDie());
        }
    });

    it('after initialize at least half the dice are basic colors', () => {
        // Force a worst-case: all gold/black, then initialize must fix it.
        const src = new ManaSource(5);
        src.dice = Array(7).fill(MANA_COLORS.GOLD);
        src.usedDice.clear();
        src['ensureBasicColors']();

        const basicCount = src.dice.filter((c) => BASIC.includes(c)).length;
        const required = Math.ceil(src.dice.length / 2);
        expect(basicCount).toBeGreaterThanOrEqual(required);
    });

    it('ensureBasicColors leaves an already-good set untouched', () => {
        const src = new ManaSource(1);
        src.dice = [MANA_COLORS.RED, MANA_COLORS.BLUE, MANA_COLORS.WHITE];
        src.usedDice.clear();
        src['ensureBasicColors']();
        expect(src.dice).toEqual([MANA_COLORS.RED, MANA_COLORS.BLUE, MANA_COLORS.WHITE]);
    });
});

describe('ManaSource - availability & taking dice', () => {
    let src;
    beforeEach(() => {
        src = new ManaSource(1);
        src.dice = [MANA_COLORS.RED, MANA_COLORS.GOLD, MANA_COLORS.BLACK];
        src.usedDice.clear();
    });

    it('isDieAvailable true for basic color during day', () => {
        expect(src.isDieAvailable(0, false)).toBe(true);
    });

    it('gold unavailable at night, black unavailable during day', () => {
        expect(src.isDieAvailable(1, false)).toBe(true);  // gold by day
        expect(src.isDieAvailable(1, true)).toBe(false);  // gold by night
        expect(src.isDieAvailable(2, false)).toBe(false); // black by day
        expect(src.isDieAvailable(2, true)).toBe(true);   // black by night
    });

    it('returns false for negative index', () => {
        expect(src.isDieAvailable(-1)).toBe(false);
    });

    it('returns false for out-of-range index', () => {
        expect(src.isDieAvailable(99)).toBe(false);
    });

    it('returns false for already-used die', () => {
        src.usedDice.add(0);
        expect(src.isDieAvailable(0)).toBe(false);
    });

    it('takeDie returns color and marks used', () => {
        const color = src.takeDie(0);
        expect(color).toBe(MANA_COLORS.RED);
        expect(src.usedDice.has(0)).toBe(true);
    });

    it('takeDie returns null for unavailable die', () => {
        expect(src.takeDie(2, false)).toBeNull(); // black by day
        expect(src.takeDie(99)).toBeNull();
    });

    it('getAvailableDice reflects availability flags', () => {
        const dice = src.getAvailableDice(false);
        expect(dice.length).toBe(3);
        expect(dice[0].available).toBe(true);  // red
        expect(dice[2].available).toBe(false); // black by day
    });

    it('getAvailableDice at night disables gold', () => {
        const dice = src.getAvailableDice(true);
        expect(dice[1].available).toBe(false); // gold
    });
});

describe('ManaSource - by color queries', () => {
    let src;
    beforeEach(() => {
        src = new ManaSource(1);
        src.dice = [MANA_COLORS.RED, MANA_COLORS.RED, MANA_COLORS.BLUE];
        src.usedDice.clear();
    });

    it('getDiceByColor returns unused dice of that color', () => {
        const reds = src.getDiceByColor(MANA_COLORS.RED);
        expect(reds.length).toBe(2);
        expect(reds.every((d) => d.color === MANA_COLORS.RED)).toBe(true);
    });

    it('getDiceByColor excludes used dice', () => {
        src.usedDice.add(0);
        const reds = src.getDiceByColor(MANA_COLORS.RED);
        expect(reds.length).toBe(1);
        expect(reds[0].index).toBe(1);
    });

    it('hasColor reflects availability', () => {
        expect(src.hasColor(MANA_COLORS.RED)).toBe(true);
        expect(src.hasColor(MANA_COLORS.GREEN)).toBe(false);
    });
});

describe('ManaSource - return / recharge', () => {
    let src;
    beforeEach(() => {
        src = new ManaSource(1);
        src.dice = [MANA_COLORS.RED, MANA_COLORS.BLUE, MANA_COLORS.GREEN];
        src.usedDice.add(0);
        src.usedDice.add(1);
    });

    it('returnDice clears used set', () => {
        src.returnDice();
        expect(src.usedDice.size).toBe(0);
    });

    it('returnDice re-rolls used dice', () => {
        // Make used dice deterministic
        const spy = vi.spyOn(src, 'rollDie').mockReturnValue(MANA_COLORS.WHITE);
        src.returnDice();
        expect(src.dice[0]).toBe(MANA_COLORS.WHITE);
        expect(src.dice[1]).toBe(MANA_COLORS.WHITE);
        spy.mockRestore();
    });

    it('recharge aliases returnDice', () => {
        src.recharge();
        expect(src.usedDice.size).toBe(0);
    });
});

describe('ManaSource - persistence', () => {
    it('round-trips state via getState/loadState', () => {
        const src = new ManaSource(2);
        src.dice = [MANA_COLORS.RED, MANA_COLORS.BLUE, MANA_COLORS.GOLD, MANA_COLORS.WHITE];
        src.usedDice.add(2);
        const state = src.getState();
        expect(state.dice).toEqual([MANA_COLORS.RED, MANA_COLORS.BLUE, MANA_COLORS.GOLD, MANA_COLORS.WHITE]);
        expect(state.usedDice).toContain(2);

        const other = new ManaSource(1);
        other.loadState(state);
        expect(other.dice).toEqual(src.dice);
        expect(other.usedDice.has(2)).toBe(true);
    });

    it('loadState handles null/undefined gracefully', () => {
        const src = new ManaSource(1);
        expect(() => src.loadState(null)).not.toThrow();
        expect(() => src.loadState(undefined)).not.toThrow();
        // dice default from constructor remain intact
        expect(src.dice.length).toBeGreaterThan(0);
    });

    it('loadState accepts partial state', () => {
        const src = new ManaSource(1);
        src.loadState({ dice: [MANA_COLORS.GREEN] });
        expect(src.dice).toEqual([MANA_COLORS.GREEN]);
        expect(src.usedDice.size).toBe(0);
    });
});

describe('ManaSource - getPlayableCardsCount', () => {
    let src;
    beforeEach(() => {
        src = new ManaSource(1);
        // 3 available: red, blue, gold (gold is wildcard)
        src.dice = [MANA_COLORS.RED, MANA_COLORS.BLUE, MANA_COLORS.GOLD];
        src.usedDice.clear();
    });

    const card = (over) => ({ manaCost: 1, color: 'red', isWound: () => false, ...over });

    it('returns zeros for empty hand', () => {
        expect(src.getPlayableCardsCount([])).toEqual({ playable: 0, total: 0 });
    });

    it('counts zero-cost cards as playable', () => {
        const hand = [card({ manaCost: 0 }), card({ manaCost: 0 })];
        expect(src.getPlayableCardsCount(hand)).toEqual({ playable: 2, total: 2 });
    });

    it('skips wound cards', () => {
        const hand = [card({ isWound: () => true })];
        expect(src.getPlayableCardsCount(hand)).toEqual({ playable: 0, total: 1 });
    });

    it('counts cards whose color is available', () => {
        const hand = [card({ color: 'red' }), card({ color: 'blue' })];
        const res = src.getPlayableCardsCount(hand);
        expect(res.playable).toBe(2);
        expect(res.total).toBe(2);
    });

    it('uses gold as wildcard for missing color', () => {
        // green not available, but gold covers it
        const hand = [card({ color: 'green' })];
        expect(src.getPlayableCardsCount(hand).playable).toBe(1);
    });

    it('does not count cards when neither color nor wildcard available', () => {
        // remove gold wildcard
        src.dice = [MANA_COLORS.RED, MANA_COLORS.BLUE, MANA_COLORS.BLACK];
        src.usedDice.clear();
        const hand = [card({ color: 'green', manaCost: 5 })];
        expect(src.getPlayableCardsCount(hand).playable).toBe(0);
    });
});

describe('CrystalStorage', () => {
    let storage;
    beforeEach(() => {
        storage = new CrystalStorage();
    });

    it('starts with zero crystals for the four basic colors', () => {
        expect(storage.getCount(MANA_COLORS.RED)).toBe(0);
        expect(storage.getCount(MANA_COLORS.BLUE)).toBe(0);
        expect(storage.getCount(MANA_COLORS.WHITE)).toBe(0);
        expect(storage.getCount(MANA_COLORS.GREEN)).toBe(0);
    });

    it('addCrystal increments up to the cap of 3', () => {
        expect(storage.addCrystal(MANA_COLORS.RED)).toBe(true);
        expect(storage.getCount(MANA_COLORS.RED)).toBe(1);
        storage.addCrystal(MANA_COLORS.RED);
        storage.addCrystal(MANA_COLORS.RED);
        expect(storage.getCount(MANA_COLORS.RED)).toBe(3);
        // Cap reached
        expect(storage.addCrystal(MANA_COLORS.RED)).toBe(false);
        expect(storage.getCount(MANA_COLORS.RED)).toBe(3);
    });

    it('rejects unknown crystal color', () => {
        expect(storage.addCrystal('purple')).toBe(false);
    });

    it('useCrystal decrements and returns false when empty', () => {
        expect(storage.useCrystal(MANA_COLORS.BLUE)).toBe(false);
        storage.addCrystal(MANA_COLORS.BLUE);
        expect(storage.useCrystal(MANA_COLORS.BLUE)).toBe(true);
        expect(storage.getCount(MANA_COLORS.BLUE)).toBe(0);
        expect(storage.useCrystal(MANA_COLORS.BLUE)).toBe(false);
    });

    it('hasColor reflects availability', () => {
        expect(storage.hasColor(MANA_COLORS.GREEN)).toBe(false);
        storage.addCrystal(MANA_COLORS.GREEN);
        expect(storage.hasColor(MANA_COLORS.GREEN)).toBe(true);
    });

    it('getAll returns a copy of the crystal counts', () => {
        storage.addCrystal(MANA_COLORS.RED);
        const all = storage.getAll();
        expect(all[MANA_COLORS.RED]).toBe(1);
        // Mutating the copy does not affect internal state
        all[MANA_COLORS.RED] = 99;
        expect(storage.getCount(MANA_COLORS.RED)).toBe(1);
    });
});
