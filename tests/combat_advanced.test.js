import { describe, it, expect } from './testRunner.js';
import { Combat, COMBAT_PHASE } from '../js/combat.js';
import { Hero } from '../js/hero.js';
import { Unit, UNIT_TYPES } from '../js/unit.js';

// Mock Enemy
class MockEnemy {
    constructor(armor, attack, fame = 1) {
        this.id = Math.random();
        this.name = 'Mock Enemy';
        this.armor = armor;
        this.attack = attack;
        this.fame = fame;
    }
    getEffectiveAttack() { return this.attack; }
    getBlockRequirement() { return this.attack; }
}

describe('Combat Advanced', () => {
    it('should allow unit activation for block', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(5, 5); // 5 Attack
        const combat = new Combat(hero, enemy);
        combat.start(); // Enters BLOCK phase

        // Swordsmen have 3 Block
        const swordsman = new Unit(UNIT_TYPES.SWORDSMEN);

        const result = combat.activateUnit(swordsman);

        expect(result.success).toBe(true);
        expect(combat.unitBlockPoints).toBe(3);
        expect(swordsman.isReady()).toBe(false);

        // Now block with unit help
        // Hero needs 2 more block (5 - 3 = 2)
        const blockResult = combat.blockEnemy(enemy, 2);

        expect(blockResult.success).toBe(true);
        expect(blockResult.blocked).toBe(true);
        expect(blockResult.totalBlock).toBe(5);
    });

    it('should allow unit activation for attack', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(5, 5); // 5 Armor
        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endBlockPhase(); // Enters DAMAGE phase
        combat.damagePhase(); // Enters ATTACK phase

        expect(combat.phase).toBe(COMBAT_PHASE.ATTACK);

        // Swordsmen have 3 Attack
        const swordsman = new Unit(UNIT_TYPES.SWORDSMEN);

        const result = combat.activateUnit(swordsman);

        expect(result.success).toBe(true);
        expect(combat.unitAttackPoints).toBe(3);

        // Attack with unit help
        // Hero needs 2 more attack (5 - 3 = 2)
        const attackResult = combat.attackEnemies(2);

        expect(attackResult.success).toBe(true);
        expect(attackResult.defeated.length).toBe(1);
        expect(combat.defeatedEnemies.length).toBe(1);
    });

    it('should handle multiple enemies and partial defeat', () => {
        const hero = new Hero('TestHero');
        const enemy1 = new MockEnemy(3, 3, 2); // Armor 3, Fame 2
        const enemy2 = new MockEnemy(4, 4, 3); // Armor 4, Fame 3
        const combat = new Combat(hero, [enemy1, enemy2]);
        combat.start();
        combat.endBlockPhase();
        combat.damagePhase(); // ATTACK phase

        // Attack only enemy1 (Armor 3)
        const attackResult = combat.attackEnemies(3, [enemy1]);

        expect(attackResult.success).toBe(true);
        expect(attackResult.defeated.length).toBe(1);
        expect(combat.defeatedEnemies.includes(enemy1)).toBe(true);
        expect(combat.enemies.includes(enemy2)).toBe(true);
        expect(combat.enemies.length).toBe(1);
    });

    it('should complete combat with victory', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(3, 3);
        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endBlockPhase();
        combat.damagePhase();

        combat.attackEnemies(3); // Defeat enemy

        const result = combat.endCombat();

        expect(result.victory).toBe(true);
        expect(combat.isComplete()).toBe(true);
    });

    it('should complete combat without victory if enemies remain', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(3, 3);
        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endBlockPhase();
        combat.damagePhase();

        // No attack

        const result = combat.endCombat();

        expect(result.victory).toBe(false);
        expect(result.remainingEnemies.length).toBe(1);
    });
});
