import { describe, it, expect } from 'vitest';
import { CrystalStorage, MANA_COLORS } from '../js/mana.js';

describe('CrystalStorage', () => {
    it('should initialize with zero crystals', () => {
        const storage = new CrystalStorage();

        expect(storage.getCount(MANA_COLORS.RED)).toBe(0);
        expect(storage.getCount(MANA_COLORS.BLUE)).toBe(0);
        expect(storage.getCount(MANA_COLORS.WHITE)).toBe(0);
        expect(storage.getCount(MANA_COLORS.GREEN)).toBe(0);
    });

    it('should add crystals', () => {
        const storage = new CrystalStorage();

        const added = storage.addCrystal(MANA_COLORS.RED);

        expect(added).toBe(true);
        expect(storage.getCount(MANA_COLORS.RED)).toBe(1);
    });

    it('should not exceed max crystals per color', () => {
        const storage = new CrystalStorage();

        storage.addCrystal(MANA_COLORS.BLUE);
        storage.addCrystal(MANA_COLORS.BLUE);
        storage.addCrystal(MANA_COLORS.BLUE); // Max = 3
        const added = storage.addCrystal(MANA_COLORS.BLUE); // Should fail

        expect(added).toBe(false);
        expect(storage.getCount(MANA_COLORS.BLUE)).toBe(3);
    });

    it('should use crystals', () => {
        const storage = new CrystalStorage();
        storage.addCrystal(MANA_COLORS.GREEN);
        storage.addCrystal(MANA_COLORS.GREEN);

        const used = storage.useCrystal(MANA_COLORS.GREEN);

        expect(used).toBe(true);
        expect(storage.getCount(MANA_COLORS.GREEN)).toBe(1);
    });

    it('should not use crystals when none available', () => {
        const storage = new CrystalStorage();

        const used = storage.useCrystal(MANA_COLORS.WHITE);

        expect(used).toBe(false);
    });

    it('should check if color is available', () => {
        const storage = new CrystalStorage();
        storage.addCrystal(MANA_COLORS.RED);

        expect(storage.hasColor(MANA_COLORS.RED)).toBe(true);
        expect(storage.hasColor(MANA_COLORS.BLUE)).toBe(false);
    });

    it('should get all crystals', () => {
        const storage = new CrystalStorage();
        storage.addCrystal(MANA_COLORS.RED);
        storage.addCrystal(MANA_COLORS.BLUE);
        storage.addCrystal(MANA_COLORS.BLUE);

        const all = storage.getAll();

        expect(all[MANA_COLORS.RED]).toBe(1);
        expect(all[MANA_COLORS.BLUE]).toBe(2);
        expect(all[MANA_COLORS.WHITE]).toBe(0);
        expect(all[MANA_COLORS.GREEN]).toBe(0);
    });
});
