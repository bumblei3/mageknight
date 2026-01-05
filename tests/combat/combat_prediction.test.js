import { describe, it, expect, beforeEach, afterEach } from '../testRunner.js';
import Combat from '../../js/combat.js';
import { Hero } from '../../js/hero.js';
import { ENEMY_DEFINITIONS, COMBAT_PHASES } from '../../js/constants.js'; // Ensure correct import

describe('Combat Prediction', () => {
    let hero;
    let orc, dragon, necromancer;

    // Mock enemies helper
    const createEnemy = (def, id) => {
        // Safe access to definition properties with defaults
        const definition = def || { name: 'Unknown', attack: 1, armor: 1 };

        return {
            ...definition,
            id: id,
            currentHealth: definition.maxHealth || 1,
            maxHealth: definition.maxHealth || 1,
            getEffectiveAttack: () => definition.attack || 1,
            getResistanceMultiplier: () => 1,
            isDefeated: () => false,
            abilities: definition.poison ? ['poison'] : [],
            poison: definition.poison || false
        };
    };

    beforeEach(() => {
        hero = new Hero('TestHero');
        hero.armor = 2;
        orc = createEnemy(ENEMY_DEFINITIONS.orc, 'orc1');
        // Ensure dragon and necromancer defs exist or use fallback
        dragon = createEnemy(ENEMY_DEFINITIONS.draconum || { name: 'Dragon', attack: 5 }, 'dragon1');
        necromancer = createEnemy(ENEMY_DEFINITIONS.necromancer || { name: 'Necro', poison: true, attack: 3 }, 'necro1');
    });

    it('should predict correct wound count for basic physical attack', () => {
        const combat = new Combat(hero, [orc]);
        combat.phase = COMBAT_PHASES.BLOCK;

        const prediction = combat.getPredictedOutcome(0, 0);

        // Orc attack 2, Hero armor 2 -> 2/2 = 1 wound
        expect(prediction.expectedWounds).toBe(1);
        expect(prediction.totalEnemyAttack).toBe(2);
        expect(prediction.isPoisoned).toBe(false);
    });

    it('should predict correct wound count for multiple enemies', () => {
        const combat = new Combat(hero, [orc, orc]);
        combat.phase = COMBAT_PHASES.BLOCK;

        const prediction = combat.getPredictedOutcome(0, 0);

        // Total attack 4, Hero armor 2 -> 4/2 = 2 wounds
        expect(prediction.expectedWounds).toBe(2);
        expect(prediction.totalEnemyAttack).toBe(4);
    });

    it('should account for blocked enemies', () => {
        const orc2 = createEnemy(ENEMY_DEFINITIONS.orc, 'orc2');
        const combat = new Combat(hero, [orc, orc2]);
        combat.phase = COMBAT_PHASES.BLOCK;
        combat.blockedEnemies.add(orc.id);

        const prediction = combat.getPredictedOutcome(0, 0);

        // Total attack 2 (1 blocked), Hero armor 2 -> 2/2 = 1 wound
        expect(prediction.expectedWounds).toBe(1);
        expect(prediction.totalEnemyAttack).toBe(2);
    });

    it('should detect poison attacks', () => {
        const combat = new Combat(hero, [necromancer]);
        combat.phase = COMBAT_PHASES.BLOCK;

        const prediction = combat.getPredictedOutcome(0, 0);

        expect(prediction.isPoisoned).toBe(true);
        expect(prediction.poisonWounds).toBeGreaterThan(0);
    });

    it('should predict defeated enemies based on attack power', () => {
        const combat = new Combat(hero, [orc]);
        combat.phase = COMBAT_PHASES.ATTACK;

        // Not enough attack (Orc armor is 3 usually)
        let prediction = combat.getPredictedOutcome(2, 0);
        expect(prediction.enemiesDefeated.includes('Ork')).toBe(false);

        // Enough attack
        prediction = combat.getPredictedOutcome(3, 0);
        expect(prediction.enemiesDefeated.includes('Ork')).toBe(true);
    });

    it('should return null if combat is complete', () => {
        const combat = new Combat(hero, [orc]);
        combat.phase = COMBAT_PHASES.COMPLETE;
        expect(combat.getPredictedOutcome()).toBe(null);
    });
});
