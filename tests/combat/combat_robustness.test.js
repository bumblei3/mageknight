
import { describe, it, expect, beforeEach, afterEach } from '../testRunner.js';
import Combat, { COMBAT_PHASE as COMBAT_PHASES } from '../../js/combat.js';
import Hero from '../../js/hero.js';
import { Enemy } from '../../js/enemy.js';
import { Unit, UNIT_TYPES } from '../../js/unit.js';
import { Card, CARD_TYPES, CARD_COLORS } from '../../js/card.js';
import { setupGlobalMocks, resetMocks, createSpy } from '../test-mocks.js';

// Setup global mocks
setupGlobalMocks();

describe('Combat Robustness & Edge Cases', () => {
    let hero;
    let combat;

    beforeEach(() => {
        resetMocks();
        hero = new Hero('TestHero');
        // Ensure hero has some cards
        hero.hand = [
            new Card({ id: 'c1', name: 'Attack Card', type: CARD_TYPES.ACTION, color: CARD_COLORS.RED, value: 2 }),
            new Card({ id: 'c2', name: 'Block Card', type: CARD_TYPES.ACTION, color: CARD_COLORS.BLUE, value: 2 })
        ];
    });

    afterEach(() => {
        resetMocks();
    });

    it('should handle multiple enemies with mixed resistances correctly', () => {
        const fireEnemy = new Enemy({ name: 'Fire Orc', attack: 3, armor: 3, fireResist: true, physicalResist: true });
        const iceEnemy = new Enemy({ name: 'Ice Orc', attack: 3, armor: 3, iceResist: true });

        combat = new Combat(hero, [fireEnemy, iceEnemy]);
        combat.start();

        // Skip ranged
        combat.endRangedPhase();

        // Block phase
        combat.blockPhase();
        combat.endBlockPhase(); // Take damage

        // Attack Phase
        combat.attackPhase();

        // Attack Fire Enemy with Fire 
        const resultFire = combat.attackEnemies(6, 'fire', [fireEnemy]);
        expect(resultFire.defeated.length).toBe(1);
        expect(resultFire.defeated[0]).toBe(fireEnemy);

        // Attack Ice Enemy with Fire (efficiency 1)
        const resultIce = combat.attackEnemies(3, 'fire', [iceEnemy]);
        expect(resultIce.defeated.length).toBe(1);
    });

    it('should handle Siege Attacks efficiently in Ranged Phase', () => {
        // Fortified enemy
        const fortifiedEnemy = new Enemy({ name: 'Castle Guard', armor: 4, fortified: true });
        combat = new Combat(hero, [fortifiedEnemy]);
        combat.start();

        expect(combat.phase).toBe(COMBAT_PHASES.RANGED);

        // Ranged attack 4 (no siege) vs Fortified -> fails
        const rangedResult = combat.rangedAttackEnemy(fortifiedEnemy, 4, 0);
        expect(rangedResult.success).toBe(false);

        // Siege attack 4 vs Fortified (normal armor) -> 4 vs 4 -> success
        const siegeResult = combat.rangedAttackEnemy(fortifiedEnemy, 0, 4);
        expect(siegeResult.success).toBe(true);
    });

    it('should fail correctly if Unit is not ready during block assignment', () => {
        const enemy = new Enemy({ name: 'Orc', attack: 5 });
        combat = new Combat(hero, [enemy]);
        combat.start();
        combat.endRangedPhase();

        const unit = {
            name: 'Peasants',
            info: { block: 2 },
            isReady: () => false,
            activate: () => false
        };
        hero.units.push(unit);

        const activationResult = combat.activateUnit(unit);
        expect(activationResult.success).toBe(false);
    });

    it('should apply excessive damage as wounds to hero', () => {
        const heavyHitter = new Enemy({ name: 'Dragon', attack: 10 });
        combat = new Combat(hero, [heavyHitter]);
        combat.start();
        combat.endRangedPhase();

        // Block Phase - No block
        combat.blockPhase();
        combat.endBlockPhase();

        // Damage Phase executed in endBlockPhase
        const stats = hero.getStats();
        expect(stats.wounds).toBeGreaterThan(0);
    });

    it('should complete combat when all enemies defeated', () => {
        const enemy1 = new Enemy({ name: 'Goblin', armor: 2 });
        combat = new Combat(hero, [enemy1]);
        combat.start();

        // Immediate Ranged Kill (3 ranged, 0 siege)
        const result = combat.rangedAttackEnemy(enemy1, 3, 0);
        expect(result.success).toBe(true);
        expect(combat.enemies.length).toBe(0);

        // End phase to trigger completion check
        combat.endRangedPhase();

        expect(combat.isComplete()).toBe(true);
        expect(combat.phase).toBe(COMBAT_PHASES.COMPLETE);
    });
});
