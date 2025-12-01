import { TestRunner } from './testRunner.js';
import { Combat, COMBAT_PHASE } from '../js/combat.js';
import { Enemy } from '../js/enemy.js';
import { Hero } from '../js/hero.js';

const runner = new TestRunner();
const describe = runner.describe.bind(runner);
const it = runner.it.bind(runner);
const expect = runner.expect.bind(runner);
const beforeEach = runner.beforeEach.bind(runner);

describe('Advanced Combat Mechanics', () => {
    let hero;
    let combat;

    beforeEach(() => {
        hero = new Hero('TestHero');
        hero.armor = 2;
    });

    it('should handle Swift enemies (double block)', () => {
        const swiftEnemy = new Enemy({
            name: 'Swift Orc',
            attack: 3,
            swift: true
        });

        combat = new Combat(hero, swiftEnemy);
        combat.start();

        // Try blocking with normal amount (should fail)
        let result = combat.blockEnemy(swiftEnemy, 3);
        expect(result.blocked).toBe(false);

        // Try blocking with double amount (should succeed)
        result = combat.blockEnemy(swiftEnemy, 6);
        expect(result.blocked).toBe(true);
    });

    it('should handle Fire Resistance', () => {
        const fireEnemy = new Enemy({
            name: 'Fire Dragon',
            armor: 4,
            fireResist: true
        });

        combat = new Combat(hero, fireEnemy);
        combat.start();
        combat.endBlockPhase(); // Move to damage/attack

        // Attack with Fire (should need double damage)
        // Effective Armor = 4 / 0.5 = 8
        let result = combat.attackEnemies(4, 'fire');
        expect(result.success).toBe(false);

        result = combat.attackEnemies(8, 'fire');
        expect(result.success).toBe(true);
    });

    it('should handle Physical Resistance', () => {
        const stoneGolem = new Enemy({
            name: 'Golem',
            armor: 3,
            physicalResist: true
        });

        combat = new Combat(hero, stoneGolem);
        combat.start();
        combat.endBlockPhase();

        // Physical attack (default)
        // Effective Armor = 3 / 0.5 = 6
        let result = combat.attackEnemies(3, 'physical');
        expect(result.success).toBe(false);

        result = combat.attackEnemies(6, 'physical');
        expect(result.success).toBe(true);
    });

    it('should bypass resistance with correct element', () => {
        const fireEnemy = new Enemy({
            name: 'Fire Dragon',
            armor: 4,
            fireResist: true
        });

        combat = new Combat(hero, fireEnemy);
        combat.start();
        combat.endBlockPhase();

        // Attack with Ice (no resistance)
        // Effective Armor = 4
        let result = combat.attackEnemies(4, 'ice');
        expect(result.success).toBe(true);
    });
});
