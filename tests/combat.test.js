import { describe, it, expect } from './testRunner.js';
import { Combat, COMBAT_PHASE } from '../js/combat.js';
import { Hero } from '../js/hero.js';
import { Unit } from '../js/unit.js';

// Mock Enemy
class MockEnemy {
    constructor(armor, attack, abilities = []) {
        this.id = Math.random().toString();
        this.name = 'Mock Enemy';
        this.armor = armor;
        this.attack = attack;
        this.fame = 1;
        this.abilities = abilities;
        this.maxHealth = armor;
        this.currentHealth = armor;
        this.swift = false;
        this.poison = false;
    }
    getEffectiveAttack() { return this.attack; }
    getBlockRequirement() { return this.swift ? this.attack * 2 : this.attack; }
    getResistanceMultiplier(element) { return 1; }
}

describe('Combat', () => {
    it('should start in RANGED phase', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(3, 4);
        const combat = new Combat(hero, enemy);
        combat.start();
        expect(combat.phase).toBe(COMBAT_PHASE.RANGED);
    });

    it('should successfully block an enemy', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(3, 4);
        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endRangedPhase(); // Skip ranged for block test
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
        combat.endRangedPhase(); // Skip ranged

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
        combat.endRangedPhase(); // Skip ranged

        // Skip block
        combat.endBlockPhase();

        // Damage phase: 5 damage / 2 armor = 2.5 -> 3 wounds
        expect(combat.woundsReceived).toBe(3);
        expect(hero.wounds.length).toBe(3);
    });

    // === NEW COMPREHENSIVE TESTS ===

    it('should handle multiple enemies', () => {
        const hero = new Hero('TestHero');
        const enemy1 = new MockEnemy(2, 3);
        const enemy2 = new MockEnemy(3, 4);
        const combat = new Combat(hero, [enemy1, enemy2]);
        combat.start();
        combat.endRangedPhase();

        expect(combat.enemies.length).toBe(2);

        // Block first enemy
        const result1 = combat.blockEnemy(enemy1, 3);
        expect(result1.blocked).toBe(true);

        // End block phase - only enemy2 should deal damage
        combat.endBlockPhase();

        const expectedWounds = Math.ceil(4 / hero.armor); // 4 / 2 = 2
        expect(combat.woundsReceived).toBe(expectedWounds);
    });

    it('should require double block for swift enemies', () => {
        const hero = new Hero('TestHero');
        const swiftEnemy = new MockEnemy(3, 4);
        swiftEnemy.swift = true;

        const combat = new Combat(hero, swiftEnemy);
        combat.start();
        combat.endRangedPhase();

        // Block 4 should fail against swift (needs 8)
        const result1 = combat.blockEnemy(swiftEnemy, 4);
        expect(result1.blocked).toBe(false);

        // Block 8 should succeed
        const result2 = combat.blockEnemy(swiftEnemy, 8);
        expect(result2.blocked).toBe(true);
    });

    it('should handle poison ability', () => {
        const hero = new Hero('TestHero');
        const poisonEnemy = new MockEnemy(2, 3, ['poison']);
        const combat = new Combat(hero, poisonEnemy);

        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase(); // No block

        // Base wounds + Poison wounds (equal to base wounds) = 2 * base wounds
        const baseWounds = Math.ceil(3 / hero.armor); // 2
        expect(combat.woundsReceived).toBe(baseWounds * 2);
    });

    it('should handle vampiric ability', () => {
        const hero = new Hero('TestHero');
        const vampireEnemy = new MockEnemy(5, 4, ['vampiric']);
        vampireEnemy.currentHealth = 3; // Damaged

        const combat = new Combat(hero, vampireEnemy);
        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase(); // Deals damage, should heal

        expect(vampireEnemy.currentHealth).toBe(4); // Healed by 1
    });

    it('should track unit contributions to block', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(3, 6);
        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endRangedPhase();

        combat.unitBlockPoints = 2; // Unit adds 2 block

        const result = combat.blockEnemy(enemy, 4); // 4 + 2 = 6
        expect(result.blocked).toBe(true);
        expect(result.consumedPoints).toBe(4);
        expect(combat.unitBlockPoints).toBe(0); // All 2 unit points used
    });

    it('should track unit contributions to attack', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(8, 3);
        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase();

        combat.unitAttackPoints = 3;

        const result = combat.attackEnemies(5, 'physical'); // 5 + 3 = 8
        expect(result.success).toBe(true);
        expect(result.defeated.length).toBe(1);
    });

    it('should not allow blocking in wrong phase', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(3, 4);
        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endBlockPhase(); // Move to attack phase

        const result = combat.blockEnemy(enemy, 4);
        expect(result.error).toBeDefined();
    });

    it('should not allow attacking in block phase', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(3, 4);
        const combat = new Combat(hero, enemy);
        combat.start(); // RANGED phase
        combat.endRangedPhase(); // BLOCK phase

        const result = combat.attackEnemies(5);
        expect(result.error).toBeDefined();
    });

    it('should defeat all enemies and end combat', () => {
        const hero = new Hero('TestHero');
        const enemy1 = new MockEnemy(3, 2);
        const enemy2 = new MockEnemy(2, 2);
        const combat = new Combat(hero, [enemy1, enemy2]);

        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase();
        combat.attackEnemies(5); // Defeats both (3+2=5)

        const result = combat.endCombat();
        expect(result.victory).toBe(true);
        expect(result.defeatedEnemies.length).toBe(2);
    });

    it('should handle partial enemy defeat', () => {
        const hero = new Hero('TestHero');
        const enemy1 = new MockEnemy(2, 2);
        const enemy2 = new MockEnemy(5, 3);
        const combat = new Combat(hero, [enemy1, enemy2]);

        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase();
        // Attack only enemy1 by targeting it specifically
        combat.attackEnemies(2, 'physical', [enemy1]); // Only target enemy1

        expect(combat.enemies.length).toBe(1);
        expect(combat.defeatedEnemies.length).toBe(1);
    });

    it('should accumulate fame from defeated enemies', () => {
        const hero = new Hero('TestHero');
        const initialFame = hero.fame;
        const enemy1 = new MockEnemy(2, 2);
        enemy1.fame = 5;
        const enemy2 = new MockEnemy(3, 3);
        enemy2.fame = 7;

        const combat = new Combat(hero, [enemy1, enemy2]);
        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase();
        combat.attackEnemies(5); // Defeats both

        expect(hero.fame).toBe(initialFame + 12);
    });

    it('should handle resistance to elements', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(4, 3);
        enemy.getResistanceMultiplier = (element) => {
            return element === 'fire' ? 0.5 : 1; // Resistant to fire
        };

        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase();

        // Fire attack needs double (8) due to resistance
        const result1 = combat.attackEnemies(4, 'fire');
        expect(result1.success).toBe(false);

        const result2 = combat.attackEnemies(8, 'fire');
        expect(result2.success).toBe(true);
    });

    it('should calculate critical hits correctly', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(10, 5);
        const combat = new Combat(hero, enemy);

        // Test critical (manually set high crit chance)
        const crit = combat.calculateCriticalHit(10, 1.0); // Always crit
        expect(crit.isCrit).toBe(true);
        expect(crit.damage).toBe(15); // 10 * 1.5

        // Test non-critical
        const normal = combat.calculateCriticalHit(10, 0.0); // Never crit
        expect(normal.isCrit).toBe(false);
        expect(normal.damage).toBe(10);
    });

    it('should detect mono-color combos', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(5, 3);
        const combat = new Combat(hero, enemy);

        const redCards = [
            { color: 'red', isWound: () => false },
            { color: 'red', isWound: () => false },
            { color: 'red', isWound: () => false }
        ];

        const combo = combat.detectCombo(redCards);
        expect(combo).not.toBe(null);
        expect(combo.type).toBe('mono_color');
        expect(combo.color).toBe('red');
        expect(combo.multiplier).toBeGreaterThan(1);
    });

    it('should detect rainbow combos', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(5, 3);
        const combat = new Combat(hero, enemy);

        const rainbowCards = [
            { color: 'red', isWound: () => false },
            { color: 'blue', isWound: () => false },
            { color: 'green', isWound: () => false },
            { color: 'white', isWound: () => false }
        ];

        const combo = combat.detectCombo(rainbowCards);
        expect(combo).not.toBe(null);
        expect(combo.type).toBe('rainbow');
        expect(combo.multiplier).toBe(2.0);
    });

    it('should apply combo bonuses to attack', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(5, 3);
        const combat = new Combat(hero, enemy);

        const combo = { multiplier: 1.5 };
        const boostedAttack = combat.applyComboBonus(10, combo);

        expect(boostedAttack).toBe(15);
    });

    it('should handle zero damage scenario', () => {
        const hero = new Hero('TestHero');
        hero.armor = 10; // Very high armor
        const enemy = new MockEnemy(2, 3); // Weak attack

        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase();

        // 3 / 10 = 0.3 -> rounds up to 1 wound minimum
        expect(combat.woundsReceived).toBeGreaterThan(0);
    });

    it('should complete combat cycle correctly', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy(3, 4);
        const combat = new Combat(hero, enemy);

        // Phase progression
        expect(combat.phase).toBe(COMBAT_PHASE.NOT_IN_COMBAT);

        combat.start();
        expect(combat.phase).toBe(COMBAT_PHASE.RANGED);

        combat.endRangedPhase();
        expect(combat.phase).toBe(COMBAT_PHASE.BLOCK);

        combat.endBlockPhase();
        expect(combat.phase).toBe(COMBAT_PHASE.ATTACK);

        combat.attackEnemies(3); // Defeat enemy

        const result = combat.endCombat();
        expect(combat.phase).toBe(COMBAT_PHASE.COMPLETE);
        expect(combat.isComplete()).toBe(true);
    });

    describe('Ranged & Siege Phase Mechanics', () => {
        it('should handle siege attacks against fortified enemies', () => {
            const hero = new Hero('TestHero');
            const fortifiedEnemy = new MockEnemy(4, 4);
            fortifiedEnemy.fortified = true;
            const combat = new Combat(hero, fortifiedEnemy);
            combat.start();

            // Regular ranged attack fails (5 ranged, 0 siege)
            const rangedResult = combat.rangedAttackEnemy(fortifiedEnemy, 5, 0);
            expect(rangedResult.success).toBe(false);

            // Siege attack succeeds (0 ranged, 5 siege)
            const siegeResult = combat.rangedAttackEnemy(fortifiedEnemy, 0, 5);
            expect(siegeResult.success).toBe(true);
        });

        it('should return error if endRangedPhase called in wrong phase', () => {
            const hero = new Hero('TestHero');
            const combat = new Combat(hero, new MockEnemy(3, 3));
            const result = combat.endRangedPhase();
            expect(result.error).toBeDefined();
        });
    });

    describe('Boss Battle Mechanics', () => {
        it('should handle boss phase transitions', () => {
            const hero = new Hero('TestHero');
            const boss = new MockEnemy(10, 5);
            boss.isBoss = true;
            boss.takeDamage = (dmg) => ({
                defeated: false,
                healthPercent: 0.5,
                transitions: [{ phase: 'Phase 2', ability: 'enrage', message: 'Boss Enrages!' }]
            });
            boss.executePhaseAbility = () => ({ success: true });

            const combat = new Combat(hero, boss);
            combat.phase = COMBAT_PHASE.ATTACK;

            const result = combat.attackEnemies(5);
            expect(result.bossTransitions.length).toBeGreaterThan(0);
        });
    });
});
