import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RangedPhase } from '../js/combat/RangedPhase.js';
import { COMBAT_PHASES } from '../js/constants.js';
import { createEnemy } from '../js/enemy.js';

function makeUnitManager(overrides = {}) {
    return {
        totalRangedPoints: 0,
        totalSiegePoints: 0,
        unitRangedPoints: null,
        unitSiegePoints: 0,
        ...overrides,
    };
}

function makeCombat(overrides = {}) {
    return {
        phase: COMBAT_PHASES.RANGED,
        unitManager: makeUnitManager(),
        defeatedEnemies: [],
        summonedEnemies: new Map(),
        enemies: [],
        hero: { gainFame: vi.fn() },
        ...overrides,
    };
}

function makeEnemy(overrides = {}) {
    return {
        name: 'TestEnemy',
        id: 'e1',
        type: 'orc',
        armor: 4,
        fame: 2,
        currentHealth: 10,
        maxHealth: 10,
        fortified: false,
        isBoss: false,
        getResistanceMultiplier: () => 1,
        getCurrentArmor: undefined,
        takeDamage: (d) => ({ healthPercent: Math.max(0, 1 - d / 10), defeated: d >= 10, transitions: [] }),
        ...overrides,
    };
}

describe('RangedPhase', () => {
    let phase;

    beforeEach(() => {
        phase = new RangedPhase(makeCombat());
    });

    describe('update', () => {
        it('returns enemies when in RANGED phase', () => {
            const enemies = [makeEnemy()];
            const r = phase.update(enemies);
            expect(r.enemies).toBe(enemies);
        });

        it('returns error when not in RANGED phase', () => {
            phase.combat.phase = COMBAT_PHASES.ATTACK;
            const r = phase.update([makeEnemy()]);
            expect(r.error).toBeTruthy();
        });
    });

    describe('executeAttack', () => {
        it('returns error when not in RANGED phase', () => {
            phase.combat.phase = COMBAT_PHASES.ATTACK;
            const r = phase.executeAttack(makeEnemy(), 4, 0);
            expect(r.success).toBe(false);
            expect(r.error).toBeTruthy();
        });

        it('returns fortified immunity when fortified and no siege', () => {
            const enemy = makeEnemy({ fortified: true });
            const r = phase.executeAttack(enemy, 4, 0);
            expect(r.success).toBe(false);
            expect(r.message).toBeTruthy();
        });

        it('defeats a regular non-fortified enemy', () => {
            const enemy = makeEnemy({ armor: 4, fame: 3 });
            phase.combat.unitManager = makeUnitManager({ totalRangedPoints: 5, totalSiegePoints: 0 });
            const r = phase.executeAttack(enemy, 4, 0);
            expect(r.success).toBe(true);
            expect(r.defeated).toContain(enemy);
            expect(r.fameGained).toBe(3);
            expect(phase.combat.hero.gainFame).toHaveBeenCalledWith(3);
        });

        it('defeats a fortified enemy using siege', () => {
            const enemy = makeEnemy({ fortified: true, armor: 4, fame: 3 });
            phase.combat.unitManager = makeUnitManager({ totalSiegePoints: 5 });
            const r = phase.executeAttack(enemy, 0, 4);
            expect(r.success).toBe(true);
            expect(r.defeated).toContain(enemy);
        });

        it('reports weak attack when combined attack < effective armor', () => {
            const enemy = makeEnemy({ armor: 10 });
            phase.combat.unitManager = makeUnitManager({ totalRangedPoints: 0 });
            const r = phase.executeAttack(enemy, 1, 0);
            expect(r.success).toBe(false);
            expect(r.message).toBeTruthy();
        });

        it('handles a boss enemy with transition', () => {
            const enemy = makeEnemy({
                isBoss: true,
                armor: 4,
                fame: 5,
                takeDamage: () => ({ healthPercent: 0.5, defeated: false, transitions: [{ phase: 'enraged', ability: 'x', message: 'wütend' }] }),
            });
            phase.combat.unitManager = makeUnitManager({ totalRangedPoints: 5 });
            const r = phase.executeAttack(enemy, 4, 0);
            expect(r.isBoss).toBe(true);
            expect(r.bossTransitions.length).toBe(1);
            expect(r.bossTransitions[0].phase).toBe('enraged');
        });

        it('handles a boss enemy defeat', () => {
            const enemy = makeEnemy({
                isBoss: true,
                armor: 4,
                fame: 5,
                takeDamage: () => ({ healthPercent: 0, defeated: true, transitions: [] }),
            });
            phase.combat.unitManager = makeUnitManager({ totalRangedPoints: 5 });
            const r = phase.executeAttack(enemy, 4, 0);
            expect(r.defeated).toContain(enemy);
            expect(r.fameGained).toBe(5);
            expect(r.message).toBeTruthy();
        });
    });

    describe('handleSummoning', () => {
        it('does nothing when no summoners present', () => {
            const enemies = [makeEnemy({ summoner: false })];
            expect(() => phase.handleSummoning(enemies, [])).not.toThrow();
        });

        it('summons a minion via constructor when available', () => {
            const summoner = createEnemy('orc');
            summoner.summoner = true;
            const combat = makeCombat({ enemies: [summoner] });
            const p = new RangedPhase(combat);
            p.handleSummoning([summoner], []);
            expect(combat.summonedEnemies.has(`summoned_${summoner.id}_`)).toBe(false); // id suffix varies by time
            // The summoned enemy should have replaced the summoner in combat.enemies
            expect(combat.enemies.length).toBe(1);
            expect(combat.enemies[0].summoned).toBe(true);
        });

        it('uses fallback object when constructor unavailable', () => {
            const summoner = { id: 's1', name: 'S', summoner: true, constructor: null };
            const combat = makeCombat({ enemies: [summoner] });
            const p = new RangedPhase(combat);
            p.handleSummoning([summoner], []);
            expect(combat.enemies[0].summoned).toBe(true);
            expect(combat.enemies[0].getResistanceMultiplier()).toBe(1);
        });

        it('skips already-defeated summoners', () => {
            const summoner = createEnemy('orc');
            summoner.summoner = true;
            const combat = makeCombat({ enemies: [summoner] });
            const p = new RangedPhase(combat);
            p.handleSummoning([summoner], [summoner]);
            // Not summoned because it is in defeatedEnemies
            expect(combat.enemies[0]).toBe(summoner);
        });
    });
});
