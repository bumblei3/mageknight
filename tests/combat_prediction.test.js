import { describe, it, expect, beforeEach, vi } from 'vitest';
import Combat, { COMBAT_PHASES } from '../js/combat.js';
import { Hero } from '../js/hero.js';
import { ENEMY_DEFINITIONS } from '../js/constants.js';

describe('Combat Prediction', () => {
    let hero;
    let orc, dragon, necromancer;

    // Mock enemies
    const createEnemy = (def, id) => ({
        ...def,
        id: id,
        currentHealth: def.maxHealth || 1, // Ensure bosses have health
        maxHealth: def.maxHealth || 1, // Ensure bosses have health
        getEffectiveAttack: () => def.attack,
        getBlockRequirement: () => def.attack,
        getResistanceMultiplier: () => 1,
        isDefeated: () => false,
        abilities: def.poison ? ['poison'] : [],
        poison: def.poison
    });

    beforeEach(() => {
        hero = new Hero('TestHero');
        hero.armor = 2;
        orc = createEnemy(ENEMY_DEFINITIONS.orc, 'orc1');
        dragon = createEnemy(ENEMY_DEFINITIONS.dragon, 'dragon1');
        necromancer = createEnemy(ENEMY_DEFINITIONS.necromancer, 'necro1');
    });

    it('should predict correct wound count for basic physical attack', () => {
        const combat = new Combat(hero, [orc]); // Orc attack 2
        combat.phase = COMBAT_PHASES.BLOCK;

        const prediction = combat.getPredictedOutcome(0, 0);

        // Orc attack 2, Hero armor 2 -> 2/2 = 1 wound
        expect(prediction.expectedWounds).toBe(1);
        expect(prediction.totalEnemyAttack).toBe(2);
        expect(prediction.isPoisoned).toBe(false);
    });

    it('should predict correct wound count for multiple enemies', () => {
        const combat = new Combat(hero, [orc, orc]); // 2 Orcs, total attack 4
        combat.phase = COMBAT_PHASES.BLOCK;

        const prediction = combat.getPredictedOutcome(0, 0);

        // Total attack 4, Hero armor 2 -> 4/2 = 2 wounds
        expect(prediction.expectedWounds).toBe(2);
        expect(prediction.totalEnemyAttack).toBe(4);
    });

    it('should account for blocked enemies', () => {
        const combat = new Combat(hero, [orc, orc]);
        combat.phase = COMBAT_PHASES.BLOCK;
        combat.blockedEnemies.add(orc.id); // Block one orc

        const prediction = combat.getPredictedOutcome(0, 0);

        // Total attack 2 (1 blocked), Hero armor 2 -> 2/2 = 1 wound
        expect(prediction.expectedWounds).toBe(1);
        expect(prediction.totalEnemyAttack).toBe(2);
    });

    it('should detect poison attacks', () => {
        const combat = new Combat(hero, [necromancer]); // Necro has poison
        combat.phase = COMBAT_PHASES.BLOCK;

        const prediction = combat.getPredictedOutcome(0, 0);

        expect(prediction.isPoisoned).toBe(true);
        expect(prediction.poisonWounds).toBeGreaterThan(0);
    });

    it('should predict defeated enemies based on attack power', () => {
        const combat = new Combat(hero, [orc]); // Orc armor 3
        combat.phase = COMBAT_PHASES.ATTACK;

        // Not enough attack
        let prediction = combat.getPredictedOutcome(2, 0);
        expect(prediction.enemiesDefeated).not.toContain('Ork');

        // Enough attack
        prediction = combat.getPredictedOutcome(3, 0);
        expect(prediction.enemiesDefeated).toContain('Ork');
    });

    it('should return null if combat is complete', () => {
        const combat = new Combat(hero, [orc]);
        combat.phase = COMBAT_PHASES.COMPLETE;
        expect(combat.getPredictedOutcome()).toBeNull();
    });
});
