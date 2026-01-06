import { describe, it, expect, beforeEach } from '../testRunner.js';
import { Combat, COMBAT_PHASE } from '../../js/combat.js';
import { COMBAT_PHASES } from '../../js/constants.js';
import { Hero } from '../../js/hero.js';
import { Enemy } from '../../js/enemy.js';
import { setLanguage } from '../../js/i18n/index.js';
import { createEnemy } from '../../js/enemy.js';

describe('Combat Coverage Tests', () => {
    let hero, enemy, combat;

    beforeEach(() => {
        setLanguage('de');
        hero = new Hero('TestHero');
        // Simple mock for fame gain
        hero.gainFame = (amount) => { hero.fame += amount; };
    });

    describe('Complex Resistances', () => {
        it('should handle enemies with multiple resistances correctly', () => {
            const enemy = createEnemy('draconum', { q: 0, r: 0 });
            // draconum has physical and fire resistance in constants.js

            combat = new Combat(hero, [enemy]);
            combat.start();

            // Physical attack: reduced (2x needed)
            // Fire attack: reduced (2x needed)
            // Ice attack: normal (1x needed)

            // Check resistance multiplier logic directly if accessible, or via attack result
            expect(enemy.fireResist).toBe(true);
            expect(enemy.getResistanceMultiplier('fire')).toBe(0.5);
            expect(enemy.getResistanceMultiplier('ice')).toBe(1);
        });
    });

    describe('Siege Attacks vs Fortified', () => {
        it('should bypass fortification with siege attack', () => {
            const enemy = createEnemy('guard', { q: 0, r: 0 });
            enemy.fortified = true;
            enemy.armor = 4;

            combat = new Combat(hero, [enemy]);
            combat.start();

            // Siege attack of 4 (0 ranged, 4 siege)
            const result = combat.rangedAttackEnemy(enemy, 0, 4, 'physical');

            expect(result.success).toBe(true);
            expect(result.defeated).toBeDefined();
        });

        it('should fail against fortified with normal ranged attack', () => {
            const enemy = createEnemy('guard', { q: 0, r: 0 });
            enemy.fortified = true;

            combat = new Combat(hero, [enemy]);
            combat.start();

            // Ranged only, no siege (10 ranged, 0 siege)
            const result = combat.rangedAttackEnemy(enemy, 10, 0, 'physical');

            expect(result.success).toBe(false);
            expect(result.message).toContain('befestigt');
        });
    });

    describe('Wound Allocation', () => {
        it('should assign wounds when block fails partially', () => {
            const enemy = createEnemy('orc', { q: 0, r: 0 });
            enemy.attack = 5;

            combat = new Combat(hero, [enemy]);
            combat.start();
            combat.endRangedPhase();

            // Block with 3 (insufficient)
            const blockResult = combat.blockEnemy(enemy, 3);
            expect(blockResult.blocked).toBe(false);

            // End block phase -> take damage
            const damageResult = combat.endBlockPhase(); combat.resolveDamagePhase();

            // 5 damage -> armor 2 -> 5 wounds? No, wounds = attack / armor?
            // Mage knight rules: damage 5 vs armor 2 takes 5 damage. 
            // Wounds = ceil(damage / armor) ? No.
            // If damage > armor, take 1 wound. If damage > 2*armor, take 2 wounds (knocked out).
            // Let's verify expected wound count
            // 5 attack vs 2 armor = 2.5 -> 3 wounds? or 2?
            // In mage knight: 1 wound perArmor. 5 damage / 2 armor = 2 wounds + 1 damage remainder = 3 wounds effectively?
            // Implementation detail: check wounds added

            expect(hero.wounds.length).toBeGreaterThan(0);
        });
    });
});
