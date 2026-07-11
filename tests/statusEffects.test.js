import { describe, it, expect } from 'vitest';
import {
    StatusEffect, StatusEffectManager, EFFECT_TYPES,
} from '../js/statusEffects.js';

describe('StatusEffect', () => {
    it('uses definition for known type', () => {
        const e = new StatusEffect(EFFECT_TYPES.BURN, {});
        expect(e.name).toBe('Brennend');
        expect(e.icon).toBe('🔥');
        expect(e.duration).toBe(3);
        expect(e.remainingDuration).toBe(3);
        expect(e.stackable).toBe(true);
        expect(e.maxStacks).toBe(3);
    });

    it('falls back for unknown type', () => {
        const e = new StatusEffect('mystery', {});
        expect(e.name).toBe('mystery');
        expect(e.icon).toBe('?');
        expect(e.duration).toBe(1);
        expect(e.remainingDuration).toBe(1);
    });

    it('keeps remainingDuration -1 for infinite (poison)', () => {
        const e = new StatusEffect(EFFECT_TYPES.POISON, {});
        expect(e.remainingDuration).toBe(-1);
    });

    it('addStack respects stackable and maxStacks', () => {
        const e = new StatusEffect(EFFECT_TYPES.BURN, {}); // stackable, max 3
        expect(e.addStack()).toBe(true);
        expect(e.stacks).toBe(2);
        e.addStack();
        expect(e.stacks).toBe(3);
        expect(e.addStack()).toBe(false); // at max
    });

    it('addStack returns false for non-stackable', () => {
        const e = new StatusEffect(EFFECT_TYPES.STUN, {}); // not stackable
        expect(e.addStack()).toBe(false);
        expect(e.stacks).toBe(1);
    });

    it('tick decrements positive duration, leaves -1', () => {
        const e = new StatusEffect(EFFECT_TYPES.BURN, {});
        e.tick();
        expect(e.remainingDuration).toBe(2);
        const p = new StatusEffect(EFFECT_TYPES.POISON, {});
        p.tick();
        expect(p.remainingDuration).toBe(-1);
    });

    it('isExpired true only at 0', () => {
        const e = new StatusEffect(EFFECT_TYPES.FREEZE, {}); // duration 2
        expect(e.isExpired()).toBe(false);
        e.tick();
        expect(e.isExpired()).toBe(false);
        e.tick();
        expect(e.isExpired()).toBe(true);
    });
});

describe('StatusEffectManager', () => {
    let mgr;
    beforeEach(() => { mgr = new StatusEffectManager(); });

    describe('applyToHero', () => {
        it('applies a new effect', () => {
            const r = mgr.applyToHero({}, EFFECT_TYPES.POISON);
            expect(r.success).toBe(true);
            expect(r.applied).toBe(true);
            expect(mgr.heroHasEffect(EFFECT_TYPES.POISON)).toBe(true);
        });

        it('stacks an existing effect', () => {
            mgr.applyToHero({}, EFFECT_TYPES.POISON);
            const r = mgr.applyToHero({}, EFFECT_TYPES.POISON);
            expect(r.stacked).toBe(true);
            expect(r.applied).toBe(false);
        });
    });

    describe('applyToEnemy', () => {
        it('applies a new enemy effect', () => {
            const enemy = { id: 'e1', name: 'Orc' };
            const r = mgr.applyToEnemy(enemy, EFFECT_TYPES.FREEZE);
            expect(r.success).toBe(true);
            expect(r.applied).toBe(true);
            expect(mgr.enemyHasEffect(enemy, EFFECT_TYPES.FREEZE)).toBe(true);
        });

        it('stacks an existing enemy effect', () => {
            const enemy = { id: 'e1', name: 'Orc' };
            mgr.applyToEnemy(enemy, EFFECT_TYPES.POISON);
            const r = mgr.applyToEnemy(enemy, EFFECT_TYPES.POISON);
            expect(r.stacked).toBe(true);
        });

        it('blocks non-attack effects on arcane-immune enemies', () => {
            const enemy = { id: 'e1', name: 'Golem', arcaneImmune: true };
            const r = mgr.applyToEnemy(enemy, EFFECT_TYPES.POISON);
            expect(r.success).toBe(false);
            expect(r.blocked).toBe(true);
            expect(r.reason).toBe('arcane_immune');
        });

        it('allows stun on arcane-immune enemies', () => {
            const enemy = { id: 'e1', name: 'Golem', arcaneImmune: true };
            const r = mgr.applyToEnemy(enemy, EFFECT_TYPES.STUN);
            expect(r.success).toBe(true);
            expect(r.blocked).toBeFalsy();
        });
    });

    describe('queries', () => {
        it('heroHasEffect / enemyHasEffect', () => {
            expect(mgr.heroHasEffect(EFFECT_TYPES.BURN)).toBe(false);
            mgr.applyToHero({}, EFFECT_TYPES.BURN);
            expect(mgr.heroHasEffect(EFFECT_TYPES.BURN)).toBe(true);

            const enemy = { id: 'e1', name: 'Orc' };
            expect(mgr.enemyHasEffect(enemy, EFFECT_TYPES.BURN)).toBe(false);
            mgr.applyToEnemy(enemy, EFFECT_TYPES.BURN);
            expect(mgr.enemyHasEffect(enemy, EFFECT_TYPES.BURN)).toBe(true);
        });

        it('removeFromHero deletes effect', () => {
            mgr.applyToHero({}, EFFECT_TYPES.WEAKEN);
            mgr.removeFromHero({}, EFFECT_TYPES.WEAKEN);
            expect(mgr.heroHasEffect(EFFECT_TYPES.WEAKEN)).toBe(false);
        });

        it('getHeroEffects / getEnemyEffects return arrays', () => {
            mgr.applyToHero({}, EFFECT_TYPES.SHIELD);
            expect(mgr.getHeroEffects().length).toBe(1);
            const enemy = { id: 'e1', name: 'Orc' };
            mgr.applyToEnemy(enemy, EFFECT_TYPES.SHIELD);
            expect(mgr.getEnemyEffects(enemy).length).toBe(1);
        });
    });

    describe('processHeroPhaseStart', () => {
        it('adds burn damage equal to stacks and ticks all', () => {
            mgr.applyToHero({}, EFFECT_TYPES.BURN); // 1 stack -> 1 dmg
            const r = mgr.processHeroPhaseStart({});
            expect(r.damage).toBe(1);
        });

        it('removes expired effects after ticking', () => {
            mgr.applyToHero({}, EFFECT_TYPES.FREEZE); // duration 2
            mgr.processHeroPhaseStart({}); // tick -> 1
            expect(mgr.heroHasEffect(EFFECT_TYPES.FREEZE)).toBe(true);
            mgr.processHeroPhaseStart({}); // tick -> 0 -> expired -> removed
            expect(mgr.heroHasEffect(EFFECT_TYPES.FREEZE)).toBe(false);
        });

        it('does not expire infinite (poison) effects', () => {
            mgr.applyToHero({}, EFFECT_TYPES.POISON);
            mgr.processHeroPhaseStart({});
            expect(mgr.heroHasEffect(EFFECT_TYPES.POISON)).toBe(true);
        });
    });

    describe('processEnemyPhaseStart', () => {
        it('returns an empty array (stub)', () => {
            expect(mgr.processEnemyPhaseStart([{ id: 'e1' }])).toEqual([]);
        });
    });

    describe('processCombatEnd', () => {
        it('applies poison wounds equal to stacks', () => {
            mgr.applyToHero({}, EFFECT_TYPES.POISON);
            const r = mgr.processCombatEnd({});
            expect(r.wounds).toBe(1);
        });

        it('no wounds without poison', () => {
            expect(mgr.processCombatEnd({}).wounds).toBe(0);
        });
    });

    describe('clear', () => {
        it('clears all effects', () => {
            mgr.applyToHero({}, EFFECT_TYPES.BURN);
            mgr.applyToEnemy({ id: 'e1' }, EFFECT_TYPES.BURN);
            mgr.clear();
            expect(mgr.getHeroEffects().length).toBe(0);
            expect(mgr.getEnemyEffects({ id: 'e1' }).length).toBe(0);
        });
    });

    describe('static helpers', () => {
        it('applyEffect pushes onto statusEffects', () => {
            const unit = {};
            StatusEffectManager.applyEffect(unit, 'burn');
            expect(unit.statusEffects).toContain('burn');
        });

        it('hasEffect checks statusEffects', () => {
            const unit = { statusEffects: ['freeze'] };
            expect(StatusEffectManager.hasEffect(unit, 'freeze')).toBe(true);
            expect(StatusEffectManager.hasEffect(unit, 'burn')).toBe(false);
        });

        it('hasEffect false without statusEffects', () => {
            expect(StatusEffectManager.hasEffect({}, 'burn')).toBe(false);
        });
    });
});
