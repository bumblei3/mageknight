import { describe, it, expect, beforeEach } from 'vitest';
import { setLanguage } from '../../js/i18n/index.js';
import { Hero } from '../../js/hero.js';
import { Combat } from '../../js/combat.js';
import { Enemy } from '../../js/enemy.js';
import { COMBAT_PHASES } from '../../js/constants.js';

describe('Combat Siege and Fortified Mechanics', () => {
    let hero;
    let fortifiedEnemy;
    let normalEnemy;
    let combat;

    beforeEach(() => {
        setLanguage('de');
        hero = new Hero('TestHero');

        fortifiedEnemy = new Enemy({
            id: 'fortified_orc',
            name: 'Befestigter Ork',
            armor: 4,
            attack: 3,
            fortified: true,
            fame: 2
        });

        normalEnemy = new Enemy({
            id: 'normal_orc',
            name: 'Normaler Ork',
            armor: 3,
            attack: 2,
            fortified: false,
            fame: 2
        });
    });

    it('should NOT allow normal ranged attacks against fortified enemies', () => {
        combat = new Combat(hero, [fortifiedEnemy]);
        combat.start(); // Ranged phase

        const result = combat.rangedAttackEnemy(fortifiedEnemy, 5, 0); // 5 Ranged, 0 Siege

        expect(result.success).toBe(false);
        expect(result.message).toContain('befestigt');
        expect(combat.enemies.length).toBe(1);
    });

    it('should allow siege attacks against fortified enemies', () => {
        combat = new Combat(hero, [fortifiedEnemy]);
        combat.start();

        const result = combat.rangedAttackEnemy(fortifiedEnemy, 0, 4); // 0 Ranged, 4 Siege

        expect(result.success).toBe(true);
        expect(combat.enemies.length).toBe(0);
        expect(combat.defeatedEnemies.length).toBe(1);
    });

    it('should combine ranged and siege against NON-fortified enemies', () => {
        combat = new Combat(hero, [normalEnemy]);
        combat.start();

        // Armor 3. Play 1 Ranged and 2 Siege.
        const result = combat.rangedAttackEnemy(normalEnemy, 1, 2);

        expect(result.success).toBe(true);
        expect(combat.enemies.length).toBe(0);
    });

    it('should ONLY use siege points against fortified enemies even if ranged is present', () => {
        combat = new Combat(hero, [fortifiedEnemy]); // Armor 4
        combat.start();

        // 10 Ranged + 3 Siege = 13 total, but 3 < 4 armor.
        const result = combat.rangedAttackEnemy(fortifiedEnemy, 10, 3);

        expect(result.success).toBe(false);
        expect(result.message).toContain('zu schwach');
    });

    it('should correctly report consumed points for non-fortified enemies', () => {
        combat = new Combat(hero, [normalEnemy]); // Armor 3
        combat.start();

        const result = combat.rangedAttackEnemy(normalEnemy, 5, 2); // 5 Ranged, 2 Siege. 
        // Logic: Greedy consumption. Use units first (0), then siege (2), then ranged (1).

        expect(result.success).toBe(true);
        expect(result.consumedSiege).toBe(2);
        expect(result.consumedRanged).toBe(1);
    });

    it('should correctly report consumed points for fortified enemies', () => {
        combat = new Combat(hero, [fortifiedEnemy]); // Armor 4
        combat.start();

        const result = combat.rangedAttackEnemy(fortifiedEnemy, 10, 5); // 10 Ranged (ignored), 5 Siege.

        expect(result.success).toBe(true);
        expect(result.consumedSiege).toBe(4);
        expect(result.consumedRanged).toBe(0);
    });
});
