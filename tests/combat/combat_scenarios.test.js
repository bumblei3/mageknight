import { describe, it, expect } from 'vitest';
import { Combat } from '../../js/combat.js';
import { Hero } from '../../js/hero.js';
import { createMockEnemy } from '../test-helpers.js';

describe('Combat Scenarios', () => {

    it('should handle "The Swarm" - 3 weak enemies', () => {
        const hero = new Hero('TestHero');
        // 3 Goblins: Low stats but many
        const enemies = [
            createMockEnemy({ name: 'Goblin 1', attack: 2, armor: 2 }),
            createMockEnemy({ name: 'Goblin 2', attack: 2, armor: 2 }),
            createMockEnemy({ name: 'Goblin 3', attack: 2, armor: 2 })
        ];

        const combat = new Combat(hero, enemies);
        combat.start();
        combat.endRangedPhase(); // Skip ranged

        // Strategy: Block all (needs 6 block total)
        // Hero has 0 block initially.
        // Let's say hero plays a big block card.

        // Mock blocking each
        combat.blockEnemy(enemies[0], 2);
        combat.blockEnemy(enemies[1], 2);
        combat.blockEnemy(enemies[2], 2);

        combat.endBlockPhase(); combat.resolveDamagePhase();

        expect(combat.woundsReceived).toBe(0);

        // Attack phase: Need 6 damage to kill all
        const result = combat.attackEnemies(6);
        expect(result.defeated.length).toBe(3);

        // Check if all enemies are defeated
        expect(combat.enemies.length).toBe(0);

        // End combat to get victory status
        const endResult = combat.endCombat();
        expect(endResult.victory).toBe(true);
    });

    it('should handle "The Tank" - High armor, fortified enemy', () => {
        const hero = new Hero('TestHero');
        const tank = createMockEnemy({
            name: 'Iron Golem',
            attack: 3,
            armor: 5,
            fortified: true
        });

        const combat = new Combat(hero, tank);
        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase(); combat.resolveDamagePhase(); // Take the hit (3 damage -> 2 wounds if armor 2)

        // Attack: Fortified means ranged/siege attacks are halved? 
        // Or just high armor? In standard MK, Fortified doubles armor vs Ranged.
        // Our simplified combat might just rely on high armor value.

        // Try attacking with 4 damage (fail)
        const failResult = combat.attackEnemies(4);
        expect(failResult.success).toBe(false);

        // Try attacking with 5 damage (success)
        const successResult = combat.attackEnemies(5);
        expect(successResult.success).toBe(true);
    });

    it('should handle "The Assassin" - Swift and Poisonous', () => {
        const hero = new Hero('TestHero');
        const assassin = createMockEnemy({
            name: 'Assassin',
            attack: 4,
            armor: 3,
            swift: true,
            poison: true
        });

        const combat = new Combat(hero, assassin);
        combat.start();
        combat.endRangedPhase();

        // Try blocking with 4 (fail due to Swift)
        const blockResult = combat.blockEnemy(assassin, 4);
        expect(blockResult.blocked).toBe(false);

        combat.endBlockPhase(); combat.resolveDamagePhase();

        // Damage: 4 attack. Hero armor 2.
        // Normal: 4/2 = 2 wounds.
        // Poison: +1 wound per damage instance? Or doubles wounds?
        // In our mock logic (combat.test.js implies), poison adds extra wounds.
        // Let's verify the behavior implemented in Combat.js via this test.

        // If block failed, we take full damage.
        expect(combat.woundsReceived).toBeGreaterThan(2);
    });

    it('should handle "Elemental Fury" - Fire and Ice enemies', () => {
        const hero = new Hero('TestHero');
        const fireElemental = createMockEnemy({
            name: 'Fire Elemental',
            attack: 4,
            armor: 4,
            element: 'fire' // Custom prop for this test scenario
        });
        // Mock resistance logic on the enemy instance
        fireElemental.getResistanceMultiplier = (elem) => elem === 'fire' ? 0.5 : 1;

        const iceElemental = createMockEnemy({
            name: 'Ice Elemental',
            attack: 4,
            armor: 4,
            element: 'ice'
        });
        iceElemental.getResistanceMultiplier = (elem) => elem === 'ice' ? 0.5 : 1;

        const combat = new Combat(hero, [fireElemental, iceElemental]);
        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase(); combat.resolveDamagePhase();

        // Attack Fire Elemental with Fire (Resistant)
        // Need 4 damage. Multiplier 0.5 -> Effective 2. Fail.
        const res1 = combat.attackEnemies(4, 'fire', [fireElemental]);
        expect(res1.success).toBe(false);

        // Attack Fire Elemental with Ice (Normal)
        const res2 = combat.attackEnemies(4, 'ice', [fireElemental]);
        expect(res2.success).toBe(true);

        // Attack Ice Elemental with Fire (Normal)
        const res3 = combat.attackEnemies(4, 'fire', [iceElemental]);
        expect(res3.success).toBe(true);
    });

    it('should handle zero damage attack', () => {
        const hero = new Hero('TestHero');
        const enemy = createMockEnemy({ name: 'Orc', attack: 3, armor: 3 });

        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase(); combat.resolveDamagePhase();

        // Attack with 0 damage
        const result = combat.attackEnemies(0);
        expect(result.success).toBe(false);
        expect(combat.enemies.length).toBe(1);
    });

    it('should handle massive overkill damage', () => {
        const hero = new Hero('TestHero');
        const enemy = createMockEnemy({ name: 'Goblin', attack: 2, armor: 2 });

        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase(); combat.resolveDamagePhase();

        // Attack with excessive damage
        const result = combat.attackEnemies(9999);
        expect(result.success).toBe(true);
        expect(result.defeated.length).toBe(1);
    });

    it('should handle enemy with multiple abilities', () => {
        const hero = new Hero('TestHero');
        const enemy = createMockEnemy({
            name: 'Elite Monster',
            attack: 5,
            armor: 4,
            swift: true,
            poison: true,
            fortified: true
        });

        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endRangedPhase();

        // Try to block (should fail due to swift)
        const blockResult = combat.blockEnemy(enemy, 5);
        expect(blockResult.blocked).toBe(false);

        combat.endBlockPhase(); combat.resolveDamagePhase();

        // Should receive extra wound from poison
        expect(combat.woundsReceived).toBeGreaterThan(1);
    });

    it('should handle combat with no enemies', () => {
        const hero = new Hero('TestHero');
        const combat = new Combat(hero, []);
        combat.start();
        // Even with no enemies, we might start in ranged -> end ranged -> end block -> end combat?
        // Or if no enemies, endCombat might be called immediately?
        // Let's check combat.start logic for empty array. It sets phase to RANGED.
        combat.endRangedPhase();
        combat.endBlockPhase(); combat.resolveDamagePhase();

        const result = combat.endCombat();
        expect(result.victory).toBe(true);
        expect(result.woundsReceived).toBe(0);
    });

    it('should handle exact armor match', () => {
        const hero = new Hero('TestHero');
        const enemy = createMockEnemy({ name: 'Orc', attack: 3, armor: 5 });

        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase(); combat.resolveDamagePhase();

        // Attack with exactly the armor value
        const result = combat.attackEnemies(5);
        expect(result.success).toBe(true);
        expect(result.defeated.length).toBe(1);
    });

    it('should handle one-less-than-armor attack', () => {
        const hero = new Hero('TestHero');
        const enemy = createMockEnemy({ name: 'Orc', attack: 3, armor: 5 });

        const combat = new Combat(hero, enemy);
        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase(); combat.resolveDamagePhase();

        // Attack with armor - 1
        const result = combat.attackEnemies(4);
        expect(result.success).toBe(false);
        expect(combat.enemies.length).toBe(1);
    });
});
