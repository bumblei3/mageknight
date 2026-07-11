import { describe, it, expect, vi } from 'vitest';
import { Combat, COMBAT_PHASE } from '../js/combat.js';
import { Hero } from '../js/hero.js';

class MockEnemy {
    constructor(armor, attack, overrides = {}) {
        this.id = 'enemy_' + Math.random().toString(36).slice(2);
        this.name = 'Mock Enemy';
        this.armor = armor;
        this.attack = attack;
        this.fame = 2;
        this.abilities = [];
        this.maxHealth = armor;
        this.currentHealth = armor;
        this.swift = false;
        this.poison = false;
        this.assassin = false;
        this.damageAssigned = false;
        Object.assign(this, overrides);
    }
    getEffectiveAttack() { return this.attack; }
    getBlockRequirement() { return this.swift ? this.attack * 2 : this.attack; }
    getResistanceMultiplier() { return 1; }
    getState() { return { id: this.id, type: 'mock', name: this.name }; }
    loadState() {}
}

function makeHero(overrides = {}) {
    const hero = new Hero('TestHero');
    hero.armor = 2;
    hero.handWounds = 0;
    hero.takeWound = vi.fn(function () { hero.handWounds++; });
    hero.discardNonWoundCards = vi.fn(() => 0);
    Object.assign(hero, overrides);
    return hero;
}

function newCombat(enemies, hero) {
    const combat = new Combat(hero || makeHero(), Array.isArray(enemies) ? enemies : [enemies]);
    return combat;
}

describe('Combat (orchestrator)', () => {
    describe('constructor', () => {
        it('handles a single enemy and an array of enemies', () => {
            const single = newCombat(new MockEnemy(3, 4));
            expect(single.enemies).toHaveLength(1);
            const multi = newCombat([new MockEnemy(3, 4), new MockEnemy(2, 3)]);
            expect(multi.enemies).toHaveLength(2);
        });
    });

    describe('start', () => {
        it('resets damage system/unit manager and enters RANGED', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            const result = combat.start();
            expect(combat.phase).toBe(COMBAT_PHASE.RANGED);
            expect(result.phase).toBe(COMBAT_PHASE.RANGED);
            expect(result.enemies).toHaveLength(1);
        });
    });

    describe('phase guards (wrong phase -> error)', () => {
        it('endRangedPhase errors outside RANGED', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            const result = combat.endRangedPhase();
            expect(result.error).toBeTruthy();
        });

        it('blockPhase errors outside BLOCK', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            expect(combat.blockPhase().error).toBeTruthy();
        });

        it('blockEnemy errors outside BLOCK', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            const r = combat.blockEnemy(combat.enemies[0], 4);
            expect(r.success).toBe(false);
            expect(r.error).toBeTruthy();
        });

        it('endBlockPhase errors outside BLOCK', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            expect(combat.endBlockPhase().error).toBeTruthy();
        });

        it('damagePhase errors outside DAMAGE', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            expect(combat.damagePhase().error).toBeTruthy();
        });

        it('resolveDamagePhase returns undefined outside DAMAGE', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            expect(combat.resolveDamagePhase()).toBeUndefined();
        });

        it('assignDamageToUnit errors outside DAMAGE', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            const unit = { getName: () => 'Unit' };
            expect(combat.assignDamageToUnit(unit).success).toBe(false);
        });
    });

    describe('endRangedPhase', () => {
        it('ends combat immediately when no enemies remain', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            combat.start();
            combat.enemies = [];
            const result = combat.endRangedPhase();
            expect(combat.phase).toBe(COMBAT_PHASE.COMPLETE);
            expect(result.victory).toBe(true);
        });

        it('transitions RANGED -> BLOCK when enemies remain', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            combat.start();
            const result = combat.endRangedPhase();
            expect(combat.phase).toBe(COMBAT_PHASE.BLOCK);
            expect(result.phase).toBe(COMBAT_PHASE.BLOCK);
        });
    });

    describe('blockPhase', () => {
        it('sums unblocked enemy attack as totalDamage', () => {
            const combat = newCombat([new MockEnemy(3, 5), new MockEnemy(2, 3)]);
            combat.start();
            combat.endRangedPhase();
            const result = combat.blockPhase();
            expect(result.totalDamage).toBe(8); // 5 + 3
        });
    });

    describe('blockEnemy', () => {
        it('reports alreadyBlocked for a second block attempt', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            combat.start();
            combat.endRangedPhase();
            combat.blockEnemy(combat.enemies[0], 4); // success, adds to set
            const second = combat.blockEnemy(combat.enemies[0], 4);
            expect(second.success).toBe(false);
            expect(second.message).toBeTruthy();
        });
    });

    describe('damagePhase', () => {
        it('skips to ATTACK when all enemies are blocked', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            combat.start();
            combat.endRangedPhase();
            combat.blockEnemy(combat.enemies[0], 4); // block the only enemy
            const result = combat.endBlockPhase(); // -> DAMAGE -> damagePhase internally
            expect(combat.phase).toBe(COMBAT_PHASE.ATTACK);
            expect(result.nextPhase).toBe(COMBAT_PHASE.ATTACK);
            expect(result.waitingForAssignment).toBeFalsy();
        });

        it('reports unblocked enemies waiting for assignment', () => {
            const combat = newCombat(new MockEnemy(3, 5));
            combat.start();
            combat.endRangedPhase();
            const result = combat.endBlockPhase(); // no blocks
            expect(result.unblockedEnemies).toHaveLength(1);
            expect(result.waitingForAssignment).toBe(true);
            expect(result.totalDamage).toBe(5);
        });
    });

    describe('resolveDamagePhase', () => {
        it('computes wounds and advances to ATTACK', () => {
            const hero = makeHero({ armor: 2 });
            const combat = newCombat(new MockEnemy(3, 5), hero);
            combat.start();
            combat.endRangedPhase();
            combat.endBlockPhase(); // -> DAMAGE, sets unblockedEnemies
            const result = combat.resolveDamagePhase();
            expect(combat.phase).toBe(COMBAT_PHASE.ATTACK);
            expect(result.woundsReceived).toBe(3); // ceil(5/2)
            expect(hero.takeWound).toHaveBeenCalled();
        });

        it('returns undefined outside DAMAGE phase', () => {
            const combat = newCombat(new MockEnemy(3, 5));
            expect(combat.resolveDamagePhase()).toBeUndefined();
        });
    });

    describe('assignDamageToUnit', () => {
        function unitMock(name = 'Unit') {
            return {
                name,
                getName: () => name,
                destroyed: false,
                wounds: 0,
                getResistances: () => [],
                takeWound() { this.wounds++; },
            };
        }

        it('assigns to first eligible enemy when no id given', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            combat.start();
            combat.endRangedPhase();
            combat.endBlockPhase(); // -> DAMAGE, sets unblockedEnemies
            combat.damagePhase();
            const unit = unitMock();
            const result = combat.assignDamageToUnit(unit);
            expect(result.success).toBe(true);
            expect(combat.unblockedEnemies[0].damageAssigned).toBe(true);
        });

        it('assigns to the specific enemy by id', () => {
            const e1 = new MockEnemy(3, 4);
            const e2 = new MockEnemy(2, 3);
            const combat = newCombat([e1, e2]);
            combat.start();
            combat.endRangedPhase();
            combat.endBlockPhase(); // -> DAMAGE, sets unblockedEnemies
            combat.damagePhase();
            const unit = unitMock();
            const result = combat.assignDamageToUnit(unit, e2.id);
            expect(result.success).toBe(true);
            expect(e2.damageAssigned).toBe(true);
            expect(e1.damageAssigned).toBe(false);
        });

        it('reports alreadyAssigned for a re-assigned enemy', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            combat.start();
            combat.endRangedPhase();
            combat.endBlockPhase(); // -> DAMAGE, sets unblockedEnemies
            combat.damagePhase();
            const unit = unitMock();
            combat.assignDamageToUnit(unit);
            const second = combat.assignDamageToUnit(unitMock('Unit2'));
            expect(second.success).toBe(false);
            expect(second.message).toBeTruthy();
        });

        it('blocks assignment when only an unassigned assassin remains', () => {
            const combat = newCombat(new MockEnemy(3, 4, { assassin: true }));
            combat.start();
            combat.endRangedPhase();
            combat.endBlockPhase(); // -> DAMAGE, sets unblockedEnemies
            combat.damagePhase();
            const unit = unitMock();
            const result = combat.assignDamageToUnit(unit);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Assassin');
        });

        it('reports noEnemyToAssign when nothing matches', () => {
            const e1 = new MockEnemy(3, 4);
            const combat = newCombat([e1]);
            combat.start();
            combat.endRangedPhase();
            combat.endBlockPhase(); // -> DAMAGE, sets unblockedEnemies
            combat.damagePhase();
            // mark the only enemy as already assigned
            e1.damageAssigned = true;
            const result = combat.assignDamageToUnit(unitMock());
            expect(result.success).toBe(false);
        });
    });

    describe('handleParalyzeEffect', () => {
        it('returns 0 when no paralyze triggered', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            combat.start();
            expect(combat.handleParalyzeEffect()).toBe(0);
            expect(combat.paralyzeTriggered).toBe(false);
        });

        it('discards non-wound cards and clears flag', () => {
            const hero = makeHero();
            hero.discardNonWoundCards = vi.fn(() => 3);
            const combat = newCombat(new MockEnemy(3, 4), hero);
            combat.start();
            combat.paralyzeTriggered = true;
            combat.woundsReceived = 3;
            const discarded = combat.handleParalyzeEffect();
            expect(discarded).toBe(3);
            expect(hero.discardNonWoundCards).toHaveBeenCalledWith(3);
            expect(combat.paralyzeTriggered).toBe(false);
        });
    });

    describe('endCombat', () => {
        it('marks complete and reports victory when all enemies defeated', () => {
            const onComplete = vi.fn();
            const combat = newCombat(new MockEnemy(3, 4), undefined);
            combat.onComplete = onComplete;
            combat.start();
            combat.enemies = [];
            const result = combat.endCombat();
            expect(combat.phase).toBe(COMBAT_PHASE.COMPLETE);
            expect(result.victory).toBe(true);
            expect(result.fameGained).toBe(0);
            expect(onComplete).toHaveBeenCalledWith(result);
        });

        it('reports non-victory and sums fame of defeated', () => {
            const combat = newCombat([new MockEnemy(3, 4), new MockEnemy(2, 3)]);
            combat.start();
            const defeated = new MockEnemy(1, 1);
            defeated.fame = 5;
            combat.defeatedEnemies = [defeated];
            const result = combat.endCombat();
            expect(result.victory).toBe(false);
            expect(result.fameGained).toBe(5);
            expect(result.remainingEnemies).toHaveLength(2);
        });

        it('applies status-effect end wounds to hero', () => {
            const hero = makeHero();
            const combat = newCombat(new MockEnemy(3, 4), hero);
            combat.start();
            combat.statusEffects.processCombatEnd = vi.fn(() => ({ wounds: 2 }));
            combat.endCombat();
            expect(hero.takeWound).toHaveBeenCalledTimes(2);
            expect(combat.woundsReceived).toBe(2);
        });
    });

    describe('state persistence', () => {
        it('getState serializes combat state', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            combat.start();
            combat.endRangedPhase();
            const state = combat.getState();
            expect(state.phase).toBe(COMBAT_PHASE.BLOCK);
            expect(Array.isArray(state.enemies)).toBe(true);
            expect(Array.isArray(state.blockedEnemies)).toBe(true);
            expect(state).toHaveProperty('totalDamage');
        });

        it('loadState restores phase, enemies, blocked set', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            combat.loadState({
                phase: COMBAT_PHASE.ATTACK,
                enemies: [{ id: 'e1', type: 'mock' }],
                defeatedEnemies: [],
                blockedEnemies: ['e1'],
                totalDamage: 5,
                woundsReceived: 2,
            });
            expect(combat.phase).toBe(COMBAT_PHASE.ATTACK);
            expect(combat.blockedEnemies.has('e1')).toBe(true);
            expect(combat.totalDamage).toBe(5);
            expect(combat.woundsReceived).toBe(2);
        });

        it('loadState reuses existing enemy instances when matched by id', () => {
            const enemy = new MockEnemy(3, 4);
            const combat = newCombat([enemy]);
            const original = combat.enemies[0];
            combat.loadState({
                phase: COMBAT_PHASE.BLOCK,
                enemies: [{ id: original.id, type: 'mock', custom: 1 }],
                defeatedEnemies: [],
                blockedEnemies: [],
                totalDamage: 0,
                woundsReceived: 0,
            });
            expect(combat.enemies[0]).toBe(original);
        });

        it('loadState returns early on null state', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            expect(() => combat.loadState(null)).not.toThrow();
        });
    });

    describe('predicted outcome', () => {
        it('delegates to CombatPredictor', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            combat.start();
            const prediction = combat.getPredictedOutcome(5, 0);
            expect(prediction).toBeTruthy();
            expect(prediction).toHaveProperty('expectedWounds');
        });
    });

    describe('isComplete', () => {
        it('reflects COMPLETE phase', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            expect(combat.isComplete()).toBe(false);
            combat.phase = COMBAT_PHASE.COMPLETE;
            expect(combat.isComplete()).toBe(true);
        });
    });

    describe('compat getters/setters', () => {
        it('exposes unit point getters through unitManager', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            expect(combat.unitAttackPoints).toBeDefined();
            expect(combat.unitBlockPoints).toBeDefined();
            expect(combat.unitRangedPoints).toBeDefined();
            expect(combat.unitSiegePoints).toBeDefined();
        });

        it('activatedUnits proxies to unitManager', () => {
            const combat = newCombat(new MockEnemy(3, 4));
            expect(combat.activatedUnits).toBeDefined();
        });
    });
});
