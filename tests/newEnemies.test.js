// Tests for new enemy types

import { describe, it, expect } from './testRunner.js';
import { Enemy, createEnemy, ENEMY_DEFINITIONS } from '../js/enemy.js';

describe('New Enemy Types', () => {
    describe('Mage', () => {
        it('creates mage enemy with correct stats', () => {
            const mage = createEnemy('mage');

            expect(mage.name).toBe('Magier');
            expect(mage.armor).toBe(3);
            expect(mage.attack).toBe(4);
            expect(mage.fame).toBe(4);
            expect(mage.swift).toBe(true);
            expect(mage.physicalResist).toBe(true);
            expect(mage.attackType).toBe('ice');
            expect(mage.icon).toBe('🧙');
        });

        it('mage has resistance to physical attacks', () => {
            const mage = createEnemy('mage');
            const multiplier = mage.getResistanceMultiplier('physical');
            expect(multiplier).toBe(0.5);
        });

        it('mage is swift (requires double block)', () => {
            const mage = createEnemy('mage');
            expect(mage.getBlockRequirement()).toBe(8); // 4 * 2
        });
    });

    describe('Dragon', () => {
        it('creates dragon enemy with correct stats', () => {
            const dragon = createEnemy('dragon');

            expect(dragon.name).toBe('Drache');
            expect(dragon.armor).toBe(6);
            expect(dragon.attack).toBe(5);
            expect(dragon.fame).toBe(6);
            expect(dragon.brutal).toBe(true);
            expect(dragon.fireResist).toBe(true);
            expect(dragon.attackType).toBe('fire');
            expect(dragon.icon).toBe('🐉');
        });

        it('dragon has resistance to fire attacks', () => {
            const dragon = createEnemy('dragon');
            const multiplier = dragon.getResistanceMultiplier('fire');
            expect(multiplier).toBe(0.5);
        });

        it('dragon is brutal (deals double damage)', () => {
            const dragon = createEnemy('dragon');
            expect(dragon.getEffectiveAttack()).toBe(10); // 5 * 2
        });
    });

    describe('Phantom', () => {
        it('creates phantom enemy with correct stats', () => {
            const phantom = createEnemy('phantom');

            expect(phantom.name).toBe('Phantom');
            expect(phantom.armor).toBe(2);
            expect(phantom.attack).toBe(3);
            expect(phantom.fame).toBe(4);
            expect(phantom.swift).toBe(true);
            expect(phantom.physicalResist).toBe(true);
            expect(phantom.icon).toBe('👻');
        });

        it('phantom has resistance to physical attacks', () => {
            const phantom = createEnemy('phantom');
            expect(phantom.getResistanceMultiplier('physical')).toBe(0.5);
        });

        it('phantom is swift', () => {
            const phantom = createEnemy('phantom');
            expect(phantom.getBlockRequirement()).toBe(6); // 3 * 2
        });
    });

    describe('Golem', () => {
        it('creates golem enemy with correct stats', () => {
            const golem = createEnemy('golem');

            expect(golem.name).toBe('Golem');
            expect(golem.armor).toBe(8);
            expect(golem.attack).toBe(2);
            expect(golem.fame).toBe(5);
            expect(golem.fortified).toBe(true);
            expect(golem.iceResist).toBe(true);
            expect(golem.physicalResist).toBe(true);
            expect(golem.icon).toBe('🗿');
        });

        it('golem has high armor', () => {
            const golem = createEnemy('golem');
            expect(golem.armor).toBe(8);
        });

        it('golem has multiple resistances', () => {
            const golem = createEnemy('golem');
            expect(golem.getResistanceMultiplier('ice')).toBe(0.5);
            expect(golem.getResistanceMultiplier('physical')).toBe(0.5);
        });
    });

    describe('Vampire', () => {
        it('creates vampire enemy with correct stats', () => {
            const vampire = createEnemy('vampire');

            expect(vampire.name).toBe('Vampir');
            expect(vampire.armor).toBe(4);
            expect(vampire.attack).toBe(4);
            expect(vampire.fame).toBe(5);
            expect(vampire.brutal).toBe(true);
            expect(vampire.poison).toBe(true);
            expect(vampire.icon).toBe('🦇');
        });

        it('vampire is brutal', () => {
            const vampire = createEnemy('vampire');
            expect(vampire.getEffectiveAttack()).toBe(8); // 4 * 2
        });

        it('vampire has poison ability', () => {
            const vampire = createEnemy('vampire');
            expect(vampire.poison).toBe(true);
        });
    });

    describe('Enemy Balance', () => {
        it('all new enemies are balanced with appropriate fame for difficulty', () => {
            const mage = createEnemy('mage');
            const dragon = createEnemy('dragon');
            const phantom = createEnemy('phantom');
            const golem = createEnemy('golem');
            const vampire = createEnemy('vampire');

            // Dragon should be hardest (highest armor + brutal)
            expect(dragon.armor + dragon.getEffectiveAttack()).toBeGreaterThan(
                mage.armor + mage.getEffectiveAttack()
            );

            // Golem should have highest armor
            expect(golem.armor).toBeGreaterThanOrEqual(dragon.armor);

            // All should have reasonable fame rewards
            [mage, dragon, phantom, golem, vampire].forEach(enemy => {
                expect(enemy.fame).toBeGreaterThanOrEqual(4);
                expect(enemy.fame).toBeLessThanOrEqual(6);
            });
        });
    });
});
