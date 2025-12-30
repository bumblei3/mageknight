import { describe, it, expect, beforeEach } from './testRunner.js';
import { Hero } from '../js/hero.js';
import { ManaSource, MANA_COLORS } from '../js/mana.js';
import { Combat } from '../js/combat.js';
import { MageKnightGame } from '../js/game.js';
import { setupGlobalMocks, createSpy } from './test-mocks.js';

describe('Core Stability Tests', () => {
    beforeEach(() => {
        setupGlobalMocks();
    });

    describe('Hero Crystal Management', () => {
        it('should enforce a limit of 3 crystals per color', () => {
            const hero = new Hero('Test');
            // Add 1
            expect(hero.addCrystal('red')).toBe(true);
            expect(hero.crystals.red).toBe(1);
            // Add 2 more
            hero.addCrystal('red');
            hero.addCrystal('red');
            expect(hero.crystals.red).toBe(3);
            // Add 4th - should fail
            expect(hero.addCrystal('red')).toBe(false);
            expect(hero.crystals.red).toBe(3);
        });

        it('should correctly use crystals', () => {
            const hero = new Hero('Test');
            hero.addCrystal('blue');
            expect(hero.useCrystal('blue')).toBe(true);
            expect(hero.crystals.blue).toBe(0);
            expect(hero.useCrystal('blue')).toBe(false);
        });
    });

    describe('ManaSource ensureBasicColors', () => {
        it('should only replace minimum necessary dice to reach 50% basic', () => {
            const manaSource = new ManaSource(1); // 3 dice
            // Force 3 non-basic
            manaSource.dice = [MANA_COLORS.GOLD, MANA_COLORS.BLACK, MANA_COLORS.GOLD];
            // min required basic = ceil(3/2) = 2

            manaSource.ensureBasicColors();

            const basicColors = [MANA_COLORS.RED, MANA_COLORS.BLUE, MANA_COLORS.WHITE, MANA_COLORS.GREEN];
            const basicCount = manaSource.dice.filter(c => basicColors.includes(c)).length;

            expect(basicCount).toBe(2);
            // Verify one non-basic remains
            const nonBasicCount = manaSource.dice.filter(c => !basicColors.includes(c)).length;
            expect(nonBasicCount).toBe(1);
        });
    });

    describe('Combat Damage Safety', () => {
        it('should handle zero armor safely in damage phase', () => {
            const hero = new Hero('Test');
            hero.armor = 0; // Extreme case
            const enemy = {
                id: 'e1',
                getEffectiveAttack: () => 5,
                isDefeated: () => false
            };
            const combat = new Combat(hero, [enemy]);
            combat.phase = 'damage';

            const result = combat.damagePhase();
            // 5 damage / 1 armor (safety) = 5 wounds
            expect(result.woundsReceived).toBe(5);
        });

        it('should handle NaN damage safely', () => {
            const hero = new Hero('Test');
            const enemy = {
                id: 'e1',
                getEffectiveAttack: () => NaN,
                isDefeated: () => false
            };
            const combat = new Combat(hero, [enemy]);
            combat.phase = 'damage';

            const result = combat.damagePhase();
            expect(result.woundsReceived).toBe(0);
        });
    });

    describe('Game Controller Cleanup', () => {
        it('should generate enemy IDs without trailing spaces', () => {
            document.body.innerHTML = '<canvas id="game-board"></canvas>';
            const game = new MageKnightGame();
            game.createEnemies();
            if (game.enemies.length > 0) {
                const id = game.enemies[0].id;
                expect(id.endsWith(' ')).toBe(false);
            }
        });
    });
});
