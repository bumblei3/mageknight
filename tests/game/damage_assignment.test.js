import { describe, it, expect, beforeEach } from '../testRunner.js';
import Combat from '../../js/combat.js';
import Enemy from '../../js/enemy.js';
import { Unit } from '../../js/unit.js';
import { Hero } from '../../js/hero.js';
import { COMBAT_PHASES } from '../../js/constants.js';

// Mock dependencies
const mockLog = (msg) => { }; // console.log(msg);
const t = (key) => key;

describe('Combat Damage Assignment', () => {
    let combat;
    let hero;
    let enemy;
    let unit;

    beforeEach(() => {
        hero = new Hero();
        hero.armor = 2;
        hero.hand = [];
        hero.discard = [];
        // hero.wounds is initialized as [] in constructor

        // Setup Unit
        unit = new Unit({ name: 'Peasant', armor: 2, health: 1 });
        unit.isReady = () => true;
        unit.takeWound = function () { this.wounds = (this.wounds || 0) + 1; };

        // Setup Enemy
        enemy = new Enemy({ name: 'Orc', attack: 3, armor: 3 });
        enemy.id = 'enemy_1';

        combat = new Combat(hero, [enemy]);
        // Mock UI logs
        combat.game = { addLog: mockLog };

        // Fast forward to Block Phase -> Damage Phase
        combat.phase = COMBAT_PHASES.BLOCK;
        // Assume no block happened
        const result = combat.endBlockPhase();
        // Logic should transition to DAMAGE and wait
    });

    it('should enter interactive damage phase with unblocked enemy', () => {
        expect(combat.phase).toBe(COMBAT_PHASES.DAMAGE);
        expect(combat.unblockedEnemies.length).toBe(1);
    });

    it('should allow assigning damage to unit', () => {
        // Assign damage
        const assignResult = combat.assignDamageToUnit(unit);
        expect(assignResult.success).toBe(true);
        expect(unit.wounds).toBeGreaterThan(0);
        expect(enemy.damageAssigned).toBe(true);
        expect(combat.totalDamage).toBe(0); // Should be reduced
    });

    it('should calculate remaining hero wounds correctly', () => {
        // Resolve without assigning to unit
        // totalDamage = 3, Hero Armor = 2 => 2 Wounds (ceil(3/2) = 2)

        // Actually Combat.js recalculates in resolveDamagePhase
        const result = combat.resolveDamagePhase();

        expect(result.woundsReceived).toBe(2);
        expect(hero.wounds.length).toBe(2);
    });

    it('should deal NO wounds to hero if unit absorbs it', () => {
        combat.assignDamageToUnit(unit);

        const result = combat.resolveDamagePhase();

        // Enemy handled, so activeUnblocked is empty
        expect(result.woundsReceived).toBe(0);
        expect(hero.wounds.length).toBe(0);
        expect(unit.wounds).toBe(1);
    });

    it('should restrict assassin damage assignment', () => {
        // Re-setup with Assassin
        const assassin = new Enemy({ name: 'Assassin', attack: 3, armor: 3, assassin: true });
        assassin.id = 'assassin_1';
        const combat2 = new Combat(hero, [assassin]);
        combat2.phase = COMBAT_PHASES.BLOCK;
        combat2.endBlockPhase();

        const result = combat2.assignDamageToUnit(unit);
        expect(result.success).toBe(false); // Should fail

        const resolveResult = combat2.resolveDamagePhase();
        expect(resolveResult.woundsReceived).toBe(2); // Hero takes it
    });
});
