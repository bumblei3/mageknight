import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttackPhase } from '../js/combat/AttackPhase.js';
import { COMBAT_PHASES } from '../js/constants.js';

/**
 * Focused tests for js/combat/AttackPhase.ts (previously ~79% line coverage).
 * Exercises phase-guard, the regular-enemy group-combination logic,
 * boss handling (transitions / defeat) and the combination helper.
 */

function makeCombatCtx(over = {}) {
    return {
        phase: COMBAT_PHASES.ATTACK,
        enemies: [],
        defeatedEnemies: [],
        unitManager: { totalAttackPoints: 0 },
        blockedEnemies: new Set(),
        hero: { gainFame: vi.fn() },
        ...over,
    };
}

function makeEnemy(over = {}) {
    return {
        id: 'e1', name: 'Orc', fame: 2, armor: 3, isBoss: false,
        getResistanceMultiplier: vi.fn(() => 1),
        getCurrentArmor: vi.fn(function (blocked) { return this.armor; }),
        ...over,
    };
}

describe('AttackPhase - update', () => {
    it('rejects when not in attack phase', () => {
        const ctx = makeCombatCtx({ phase: COMBAT_PHASES.BLOCK });
        const phase = new AttackPhase(ctx);
        const res = phase.update([]);
        expect(res.error).toBeTruthy();
    });

    it('returns enemies + message when in attack phase', () => {
        const ctx = makeCombatCtx();
        const phase = new AttackPhase(ctx);
        const res = phase.update([{ id: 'e1' }]);
        expect(res.enemies).toHaveLength(1);
        expect(res.defeatedEnemies).toEqual([]);
        expect(res.message).toBeTruthy();
    });
});

describe('AttackPhase - executeAttack (regular enemies)', () => {
    let ctx, phase;
    beforeEach(() => {
        ctx = makeCombatCtx();
        phase = new AttackPhase(ctx);
    });

    it('rejects when not in attack phase', () => {
        ctx.phase = COMBAT_PHASES.BLOCK;
        const res = phase.executeAttack(5);
        expect(res.error).toBeTruthy();
    });

    it('defeats a single enemy whose armor <= attack', () => {
        const enemy = makeEnemy({ id: 'e1', armor: 3 });
        ctx.enemies = [enemy];
        const res = phase.executeAttack(5);
        expect(res.success).toBe(true);
        expect(res.defeated).toContain(enemy);
        expect(ctx.hero.gainFame).toHaveBeenCalledWith(2);
        expect(ctx.defeatedEnemies).toContain(enemy);
    });

    it('does not defeat an enemy whose armor > attack', () => {
        const enemy = makeEnemy({ id: 'e1', armor: 10 });
        ctx.enemies = [enemy];
        const res = phase.executeAttack(5);
        expect(res.success).toBe(false);
        expect(res.defeated).toHaveLength(0);
        expect(res.message).toContain('weak'); // attackWeak message
    });

    it('defeats the largest affordable group together', () => {
        const e1 = makeEnemy({ id: 'a', armor: 2 });
        const e2 = makeEnemy({ id: 'b', armor: 2 });
        const e3 = makeEnemy({ id: 'c', armor: 5 });
        ctx.enemies = [e1, e2, e3];
        // total attack 5: can defeat group {a,b} (sum 4) but not {a,b,c} (sum 9)
        const res = phase.executeAttack(5);
        expect(res.success).toBe(true);
        expect(res.defeated.map(e => e.id).sort()).toEqual(['a', 'b']);
        expect(res.defeated).not.toContain(e3);
    });

    it('accounts for resistance multiplier when computing needed armor', () => {
        const enemy = makeEnemy({
            id: 'x', armor: 6,
            getResistanceMultiplier: vi.fn(() => 0.5), // 6/0.5 = 12 effective
        });
        ctx.enemies = [enemy];
        const res = phase.executeAttack(10); // 10 < 12 -> not defeated
        expect(res.success).toBe(false);
        expect(res.defeated).toHaveLength(0);
    });

    it('adds unit attack points to total attack', () => {
        ctx.unitManager.totalAttackPoints = 4;
        const enemy = makeEnemy({ id: 'e1', armor: 6 });
        ctx.enemies = [enemy];
        const res = phase.executeAttack(5); // 5 + 4 = 9 >= 6
        expect(res.success).toBe(true);
        expect(res.unitContribution).toBe(4);
    });

    it('respects blocked-enemy flag for armor', () => {
        const enemy = makeEnemy({ id: 'e1', armor: 3 });
        ctx.blockedEnemies = new Set(['e1']);
        // getCurrentArmor is called with (blocked=true, true)
        ctx.enemies = [enemy];
        const res = phase.executeAttack(5);
        expect(enemy.getCurrentArmor).toHaveBeenCalledWith(true, true);
        expect(res.success).toBe(true);
    });

    it('defaults to all combat enemies when no targets passed', () => {
        const enemy = makeEnemy({ id: 'e1', armor: 1 });
        ctx.enemies = [enemy];
        const res = phase.executeAttack(5, 'physical');
        expect(res.success).toBe(true);
    });
});

describe('AttackPhase - executeAttack (boss)', () => {
    let ctx, phase;
    beforeEach(() => {
        ctx = makeCombatCtx();
        phase = new AttackPhase(ctx);
    });

    function makeBoss(over = {}) {
        return {
            id: 'boss', name: 'Dragon', fame: 10, isBoss: true,
            currentHealth: 20, maxHealth: 20,
            getResistanceMultiplier: vi.fn(() => 1),
            takeDamage: vi.fn(() => ({ healthPercent: 0.5, transitions: [], defeated: false })),
            ...over,
        };
    }

    it('damages a boss and reports bossDamaged', () => {
        const boss = makeBoss();
        ctx.enemies = [boss];
        const res = phase.executeAttack(10);
        expect(res.success).toBe(true);
        expect(boss.takeDamage).toHaveBeenCalled();
        expect(res.damaged[0].boss).toBe(boss);
        expect(res.messages.join(' ')).toContain('damage');
    });

    it('records transitions and executes phase ability', () => {
        const boss = makeBoss({
            takeDamage: vi.fn(() => ({
                healthPercent: 0.6,
                transitions: [{ phase: 'enraged', ability: 'fireball' }],
                defeated: false,
            })),
            executePhaseAbility: vi.fn(() => ({ ok: true })),
        });
        ctx.enemies = [boss];
        const res = phase.executeAttack(10);
        expect(res.bossTransitions.length).toBeGreaterThanOrEqual(1);
        expect(boss.executePhaseAbility).toHaveBeenCalledWith('fireball');
    });

    it('handles boss defeat', () => {
        const boss = makeBoss({
            takeDamage: vi.fn(() => ({ healthPercent: 0, transitions: [], defeated: true })),
        });
        ctx.enemies = [boss];
        const res = phase.executeAttack(20);
        expect(res.success).toBe(true);
        expect(res.defeated).toContain(boss);
        expect(ctx.hero.gainFame).toHaveBeenCalledWith(10);
    });

    it('skips enrage ability when transition ability is enrage', () => {
        const boss = makeBoss({
            takeDamage: vi.fn(() => ({
                healthPercent: 0.5,
                transitions: [{ phase: 'enraged', ability: 'enrage' }],
                defeated: false,
            })),
            executePhaseAbility: vi.fn(() => ({ ok: true })),
        });
        ctx.enemies = [boss];
        phase.executeAttack(10);
        // ability === 'enrage' should NOT call executePhaseAbility
        expect(boss.executePhaseAbility).not.toHaveBeenCalled();
    });

    it('does not call executePhaseAbility when transition has no ability', () => {
        const boss = makeBoss({
            takeDamage: vi.fn(() => ({
                healthPercent: 0.5,
                transitions: [{ phase: 'enraged' }],
                defeated: false,
            })),
            executePhaseAbility: vi.fn(() => ({ ok: true })),
        });
        ctx.enemies = [boss];
        phase.executeAttack(10);
        expect(boss.executePhaseAbility).not.toHaveBeenCalled();
    });

    it('applies resistance multiplier to boss damage', () => {
        const boss = makeBoss({
            getResistanceMultiplier: vi.fn(() => 0.5), // 10*0.5 = 5 effective
            takeDamage: vi.fn((d) => ({ healthPercent: d / 20, transitions: [], defeated: false })),
        });
        ctx.enemies = [boss];
        phase.executeAttack(10);
        expect(boss.takeDamage).toHaveBeenCalledWith(5);
    });
});

describe('AttackPhase - combination helper', () => {
    let phase;
    beforeEach(() => { phase = new AttackPhase(makeCombatCtx()); });

    it('returns single empty combo for k=0', () => {
        expect(phase['_getCombinations']([1, 2], 0)).toEqual([[]]);
    });

    it('returns empty for k > arr.length', () => {
        expect(phase['_getCombinations']([1, 2], 5)).toEqual([]);
    });

    it('returns the whole array for k === length', () => {
        const arr = [1, 2, 3];
        expect(phase['_getCombinations'](arr, 3)).toEqual([arr]);
    });

    it('returns all pairs for k=2', () => {
        const combos = phase['_getCombinations']([1, 2, 3], 2);
        expect(combos).toContainEqual([1, 2]);
        expect(combos).toContainEqual([1, 3]);
        expect(combos).toContainEqual([2, 3]);
        expect(combos).toHaveLength(3);
    });
});
