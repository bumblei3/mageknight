
import { describe, it, expect, beforeEach } from './testRunner.js';
import { Combat } from '../js/combat.js';
import { Enemy } from '../js/enemy.js';
import { Unit } from '../js/unit.js';
import { ATTACK_ELEMENTS } from '../js/constants.js';

describe('Advanced Enemy Abilities Phase 2', () => {
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

    it('should handle Summoning: Replace summoner at start of Block phase', () => {
        const necromancer = new Enemy({
            id: 'necro',
            name: 'Nekromant',
            attack: 3,
            armor: 4,
            summoner: true
        });

        combat = new Combat(heroMock, [necromancer]);
        combat.start();

        // Before endRangedPhase, it's still the Necromancer
        expect(combat.enemies[0].id).toBe('necro');

        // Transition to Block phase
        combat.endRangedPhase();

        // Now it should be replaced by a summoned enemy
        expect(combat.enemies[0].id).not.toBe('necro');
        expect(combat.enemies[0].summoned).toBe(true);
        expect(combat.summonedEnemies.has(combat.enemies[0].id)).toBe(true);
        expect(combat.summonedEnemies.get(combat.enemies[0].id).id).toBe('necro');
    });

    it('should handle Assassinate: Prevent assignment to units', () => {
        const phantom = new Enemy({
            id: 'phantom',
            attack: 3,
            assassin: true
        });
        const unit = new Unit('peasants');

        combat = new Combat(heroMock, [phantom]);
        combat.phase = 'damage';

        const result = combat.assignDamageToUnit(unit, phantom);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Attentäter');
    });

    it('should handle Paralyze: Trigger discard flag for Hero', () => {
        const mage = new Enemy({
            id: 'mage',
            attack: 4,
            petrify: true
        });

        combat = new Combat(heroMock, [mage]);
        combat.phase = 'damage';

        const result = combat.damagePhase();
        expect(result.paralyzeTriggered).toBe(true);
    });

    it('should handle Paralyze: Destroy unit on damage', () => {
        const mage = new Enemy({
            id: 'mage',
            attack: 4,
            petrify: true
        });
        const unit = new Unit('peasants');

        combat = new Combat(heroMock, [mage]);
        combat.phase = 'damage';

        const result = combat.assignDamageToUnit(unit, mage);
        expect(result.success).toBe(true);
        expect(unit.destroyed).toBe(true);
    });

    it('should handle Poison: Double wound units', () => {
        const poisonEnemy = new Enemy({
            id: 'poison_orc',
            attack: 3,
            poison: true
        });
        const unit = new Unit('peasants');

        combat = new Combat(heroMock, [poisonEnemy]);
        combat.phase = 'damage';

        const result = combat.assignDamageToUnit(unit, poisonEnemy);
        expect(result.success).toBe(true);
        expect(unit.wounds).toBe(2);
    });
});
