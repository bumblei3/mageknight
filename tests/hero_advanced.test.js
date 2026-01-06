import { describe, it, expect } from 'vitest';
import { Hero } from '../js/hero.js';
import { MANA_COLORS } from '../js/mana.js';

describe('Hero Advanced', () => {
    it('should manage temporary mana correctly', () => {
        const hero = new Hero('TestHero');

        // Add temp mana
        hero.takeManaFromSource(MANA_COLORS.RED);
        hero.takeManaFromSource(MANA_COLORS.BLUE);
        hero.takeManaFromSource(MANA_COLORS.RED);

        const inventory = hero.getManaInventory();
        expect(inventory).toHaveLength(3);
        expect(inventory).toContain(MANA_COLORS.RED);
        expect(inventory).toContain(MANA_COLORS.BLUE);
    });

    it('should spend mana correctly', () => {
        const hero = new Hero('TestHero');
        hero.takeManaFromSource(MANA_COLORS.RED);
        hero.takeManaFromSource(MANA_COLORS.BLUE);

        const spent = hero.spendMana(MANA_COLORS.RED);

        expect(spent).toBe(true);
        expect(hero.getManaInventory()).toHaveLength(1);
        expect(hero.getManaInventory()).toContain(MANA_COLORS.BLUE);
    });

    it('should not spend mana that is not available', () => {
        const hero = new Hero('TestHero');
        hero.takeManaFromSource(MANA_COLORS.RED);

        const spent = hero.spendMana(MANA_COLORS.GREEN);

        expect(spent).toBe(false);
        expect(hero.getManaInventory()).toHaveLength(1);
    });

    it('should handle gold mana as wildcard', () => {
        const hero = new Hero('TestHero');
        hero.takeManaFromSource(MANA_COLORS.GOLD);

        const spentAsRed = hero.spendMana(MANA_COLORS.RED);

        expect(spentAsRed).toBe(true);
        expect(hero.getManaInventory()).toHaveLength(0);
    });

    it('should track fame correctly', () => {
        const hero = new Hero('TestHero');
        const initialFame = hero.fame;

        hero.gainFame(5);
        expect(hero.fame).toBe(initialFame + 5);

        hero.gainFame(3);
        expect(hero.fame).toBe(initialFame + 8);
    });

    it('should track reputation correctly', () => {
        const hero = new Hero('TestHero');
        const initialRep = hero.reputation;

        hero.changeReputation(2);
        expect(hero.reputation).toBe(initialRep + 2);

        hero.changeReputation(-1);
        expect(hero.reputation).toBe(initialRep + 1);
    });

    it('should not allow reputation below minimum', () => {
        const hero = new Hero('TestHero');
        hero.reputation = 0;

        hero.changeReputation(-10);

        expect(hero.reputation).toBeGreaterThanOrEqual(-7);
        expect(hero.reputation).toBe(-7);
    });

    it('should not allow reputation above maximum', () => {
        const hero = new Hero('TestHero');
        hero.reputation = 0;

        hero.changeReputation(10);

        expect(hero.reputation).toBeLessThanOrEqual(7);
        expect(hero.reputation).toBe(7);
    });

    it('should handle wounds correctly', () => {
        const hero = new Hero('TestHero');

        hero.takeWound();
        hero.takeWound();

        expect(hero.wounds).toHaveLength(2);
    });

    it('should heal wounds', () => {
        const hero = new Hero('TestHero');
        hero.healingPoints = 2;
        hero.takeWound();
        hero.takeWound();

        const healed = hero.healWound(true);

        expect(healed).toBe(true);
        expect(hero.wounds).toHaveLength(1);
        expect(hero.healingPoints).toBe(1);
    });

    it('should not heal without healing points', () => {
        const hero = new Hero('TestHero');
        hero.healingPoints = 0;
        hero.takeWound();

        const healed = hero.healWound(true);

        expect(healed).toBe(false);
        expect(hero.wounds).toHaveLength(1);
    });

    it('should manage position and movement correctly', () => {
        const hero = new Hero('TestHero');
        hero.movementPoints = 5;

        const moved = hero.moveTo(2, 3, 4);

        expect(moved).toBe(true);
        expect(hero.position.q).toBe(2);
        expect(hero.position.r).toBe(3);
        expect(hero.movementPoints).toBe(1);
    });

    it('should not move without enough movement points', () => {
        const hero = new Hero('TestHero');
        hero.movementPoints = 2;
        const initialPos = { ...hero.position };

        const moved = hero.moveTo(5, 5, 10);

        expect(moved).toBe(false);
        expect(hero.position).toEqual(initialPos);
        expect(hero.movementPoints).toBe(2);
    });

    it('should clear temp mana at end of turn', () => {
        const hero = new Hero('TestHero');
        hero.takeManaFromSource(MANA_COLORS.RED);
        hero.takeManaFromSource(MANA_COLORS.BLUE);

        hero.endTurn();

        expect(hero.getManaInventory()).toHaveLength(0);
    });

    it('should manage units within command limit', () => {
        const hero = new Hero('TestHero');
        const mockUnit = { getName: () => 'TestUnit', refresh: () => { } };

        const added = hero.addUnit(mockUnit);

        expect(added).toBe(true);
        expect(hero.getUnits()).toHaveLength(1);
        expect(hero.getUnits()).toContain(mockUnit);
    });

    it('should not add units beyond command limit', () => {
        const hero = new Hero('TestHero');
        hero.commandLimit = 1;
        const unit1 = { getName: () => 'Unit1', refresh: () => { } };
        const unit2 = { getName: () => 'Unit2', refresh: () => { } };

        hero.addUnit(unit1);
        const added = hero.addUnit(unit2);

        expect(added).toBe(false);
        expect(hero.getUnits()).toHaveLength(1);
    });

    it('should calculate reputation modifier correctly', () => {
        const hero = new Hero('TestHero');

        hero.reputation = 3;
        expect(hero.getReputationModifier()).toBe(2);

        hero.reputation = 1;
        expect(hero.getReputationModifier()).toBe(1);

        hero.reputation = 0;
        expect(hero.getReputationModifier()).toBe(0);

        hero.reputation = -2;
        expect(hero.getReputationModifier()).toBe(-1);

        hero.reputation = -5;
        expect(hero.getReputationModifier()).toBe(-2);
    });
});
