
import { describe, it, expect, beforeEach } from '../testRunner.js';
import { Combat } from '../../js/combat.js';
import { Enemy } from '../../js/enemy.js';
import { ATTACK_ELEMENTS } from '../../js/constants.js';

describe('Advanced Enemy Abilities', () => {
    let heroMock;
    let combat;

    beforeEach(() => {
        heroMock = {
            armor: 2,
            takeWound: () => { },
            takeWoundToDiscard: () => { },
            gainFame: () => { }
        };
    });

    it('should handle Vampirism: Increase armor on wound', () => {
        const vampire = new Enemy({
            id: 'vamp',
            name: 'Vampire',
            attack: 4,
            armor: 3,
            vampiric: true
        });

        combat = new Combat(heroMock, [vampire]);

        // Setup context for Damage Phase
        combat.phase = 'damage';
        combat.blockedEnemies.clear();

        // Damage Phase: Vampire hits for 4 vs Armor 2 -> 2 Wounds
        combat.damagePhase();
        combat.resolveDamagePhase();

        expect(vampire.armorBonus).toBe(2);
        expect(vampire.getCurrentArmor()).toBe(5);
    });

    it('should handle Cumbersome: Spend movement to reduce attack', () => {
        const stoneGolem = new Enemy({
            id: 'golem',
            name: 'Golem',
            attack: 5,
            armor: 5,
            cumbersome: true
        });

        combat = new Combat(heroMock, [stoneGolem]);
        combat.phase = 'block';

        // Attack is 5. Block with 3 Physical but spend 2 Movement.
        const input = {
            blocks: [{ value: 3, element: ATTACK_ELEMENTS.PHYSICAL }],
            movementPoints: 2
        };

        const result = combat.blockEnemy(stoneGolem, input);

        expect(result.success).toBe(true);
        expect(result.blocked).toBe(true);
        expect(combat.blockedEnemies.has('golem')).toBe(true);
    });

    it('should handle Elusive: Lower armor ONLY if blocked', () => {
        const sprite = new Enemy({
            id: 'sprite',
            name: 'Sprite',
            attack: 3,
            armor: 5,
            lowerArmor: 3,
            elusive: true
        });

        combat = new Combat(heroMock, [sprite]);

        // Scenario 1: Unblocked logic
        combat.phase = 'attack';
        combat.blockedEnemies.clear();

        // Armor should be high (5)
        let effectiveArmor = sprite.getCurrentArmor(false, true);
        expect(effectiveArmor).toBe(5);


        // Scenario 2: Blocked logic
        combat.blockedEnemies.add('sprite');

        // Armor should be low (3)
        effectiveArmor = sprite.getCurrentArmor(true, true);
        expect(effectiveArmor).toBe(3);

        // Verify via combat flow
        const attackResult = combat.attackEnemies(4, 'physical', [sprite]);
        expect(attackResult.success).toBe(true);
        expect(attackResult.defeated[0].id).toBe('sprite');
    });

    it('should NOT lower Elusive armor if NOT blocked', () => {
        const sprite2 = new Enemy({
            id: 'sprite2',
            name: 'Sprite',
            armor: 5,
            lowerArmor: 3,
            elusive: true
        });

        combat = new Combat(heroMock, [sprite2]);
        combat.phase = 'attack';
        combat.blockedEnemies.clear(); // Not blocked

        // Attack 4 vs Armor 5 (Unblocked) -> Fail
        const attackResult = combat.attackEnemies(4, 'physical', [sprite2]);

        expect(attackResult.success).toBe(false);
        expect(combat.defeatedEnemies.map(e => e.id)).not.toContain('sprite2');
    });
});
