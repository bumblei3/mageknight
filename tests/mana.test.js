import { describe, it, expect } from './testRunner.js';
import { ManaSource, MANA_COLORS } from '../js/mana.js';

describe('ManaSource', () => {
    it('should initialize with correct number of dice', () => {
        const mana = new ManaSource(1);
        // Player count + 2 = 1 + 2 = 3
        expect(mana.dice.length).toBe(3);

        const mana3 = new ManaSource(3);
        // Player count + 2 = 3 + 2 = 5
        expect(mana3.dice.length).toBe(5);
    });

    it('should roll dice with valid colors', () => {
        const mana = new ManaSource(5);
        mana.initialize();

        const validColors = Object.values(MANA_COLORS);

        mana.dice.forEach(dieColor => {
            expect(validColors.includes(dieColor)).toBe(true);
        });
    });

    it('should make gold mana unavailable at night', () => {
        const mana = new ManaSource(1);
        mana.dice[0] = MANA_COLORS.GOLD;
        // Ensure it's not used
        mana.usedDice.clear();

        const isAvailableDay = mana.isDieAvailable(0, false);
        const isAvailableNight = mana.isDieAvailable(0, true);

        expect(isAvailableDay).toBe(true);
        expect(isAvailableNight).toBe(false);
    });

    it('should make black mana unavailable during day', () => {
        const mana = new ManaSource(1);
        mana.dice[0] = MANA_COLORS.BLACK;
        // Ensure it's not used
        mana.usedDice.clear();

        const isAvailableDay = mana.isDieAvailable(0, false);
        const isAvailableNight = mana.isDieAvailable(0, true);

        expect(isAvailableDay).toBe(false);
        expect(isAvailableNight).toBe(true);
    });

    it('should allow taking available mana', () => {
        const mana = new ManaSource(1);
        mana.dice[0] = MANA_COLORS.RED;
        mana.usedDice.clear();

        const result = mana.takeDie(0, false);

        expect(result).toBe(MANA_COLORS.RED);
        expect(mana.usedDice.has(0)).toBe(true);
    });

    it('should not allow taking used mana', () => {
        const mana = new ManaSource(1);
        mana.dice[0] = MANA_COLORS.RED;
        mana.usedDice.add(0); // Mark as used

        const result = mana.takeDie(0, false);

        expect(result).toBe(null);
    });

    it('should return all dice when calling returnDice', () => {
        const mana = new ManaSource(3);
        // Mark all as used
        for (let i = 0; i < mana.dice.length; i++) {
            mana.usedDice.add(i);
        }

        mana.returnDice();

        expect(mana.usedDice.size).toBe(0);
    });
});
