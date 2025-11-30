import { describe, it, expect } from './testRunner.js';
import { Combat, COMBAT_PHASE } from '../js/combat.js';
import { Hero } from '../js/hero.js';

// Mock Enemy
class MockEnemy {
    constructor(armor, attack) {
        this.id = Math.random();
        this.name = 'Mock Enemy';
        this.armor = armor;
        this.attack = attack;
        this.fame = 1;
    }
    getEffectiveAttack() { return this.attack; }
    getBlockRequirement() { return this.attack; }
}

describe('Combat', () => {
    it('should start in BLOCK phase', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(3, 4);
        const combat = new Combat(hero, enemy);
        combat.start();
        expect(combat.phase).toBe(COMBAT_PHASE.BLOCK);
    });

    it('should successfully block an enemy', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(3, 4);
        const combat = new Combat(hero, enemy);
        combat.start();

        const result = combat.blockEnemy(enemy, 4); // Block 4 vs Attack 4
        expect(result.success).toBe(true);
        expect(result.blocked).toBe(true);
        expect(combat.blockedEnemies.has(enemy.id)).toBe(true);
    });

    it('should fail to block if value is too low', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(3, 4);
        const combat = new Combat(hero, enemy);
        combat.start();

        const result = combat.blockEnemy(enemy, 3); // Block 3 vs Attack 4
        expect(result.success).toBe(true);
        expect(result.blocked).toBe(false);
    });

    it('should calculate damage correctly', () => {
        const hero = new Hero('TestHero');
        hero.armor = 2;
        const enemy = new MockEnemy(3, 5); // 5 Attack
        const combat = new Combat(hero, enemy);
        combat.start();

        // Skip block
        combat.endBlockPhase();

        // Damage phase: 5 damage / 2 armor = 2.5 -> 3 wounds
        expect(combat.woundsReceived).toBe(3);
        expect(hero.wounds.length).toBe(3);
    });
});
