
import { describe, it, expect, beforeEach } from 'vitest';
import { StatusEffect, StatusEffectManager, EFFECT_TYPES } from '../js/statusEffects.js';
import { Hero } from '../js/hero.js';
import { Enemy } from '../js/enemy.js';
import { setupGlobalMocks, resetMocks, setupStandardGameDOM } from './test-mocks.js';

setupGlobalMocks();

describe('StatusEffects Extended Coverage', () => {
    let manager;
    let hero;
    let enemy;

    beforeEach(() => {
        setupStandardGameDOM();
        resetMocks();
        manager = new StatusEffectManager();
        hero = new Hero('TestHero', { q: 0, r: 0 });
        enemy = new Enemy('orc', { q: 1, r: 0 });
    });

    describe('StatusEffect class', () => {
        it('should create effect with correct properties', () => {
            const effect = new StatusEffect(EFFECT_TYPES.STUN, hero);
            expect(effect.type).toBe(EFFECT_TYPES.STUN);
            expect(effect.duration).toBeGreaterThan(0);
        });

        it('should throw error for unknown effect type', () => {
            expect(() => new StatusEffect('unknown_effect', hero)).toThrow();
        });

        it('addStack should increment stacks', () => {
            const effect = new StatusEffect(EFFECT_TYPES.BURN, hero);
            const initial = effect.stacks;
            effect.addStack();
            expect(effect.stacks).toBe(initial + 1);
        });

        it('tick should decrease duration', () => {
            const effect = new StatusEffect(EFFECT_TYPES.STUN, hero);
            const initial = effect.remainingDuration;
            effect.tick();
            expect(effect.remainingDuration).toBe(initial - 1);
        });

        it('isExpired should return true when duration depleted', () => {
            const effect = new StatusEffect(EFFECT_TYPES.STUN, hero);
            effect.remainingDuration = 0;
            expect(effect.isExpired()).toBe(true);
        });
    });

    describe('StatusEffectManager', () => {
        it('applyToHero should add effect', () => {
            manager.applyToHero(hero, EFFECT_TYPES.BURN);
            expect(manager.heroHasEffect(EFFECT_TYPES.BURN)).toBe(true);
        });

        it('applyToEnemy should add effect', () => {
            manager.applyToEnemy(enemy, EFFECT_TYPES.STUN);
            expect(manager.enemyHasEffect(enemy, EFFECT_TYPES.STUN)).toBe(true);
        });

        it('removeFromHero should remove effect', () => {
            manager.applyToHero(hero, EFFECT_TYPES.FREEZE);
            manager.removeFromHero(hero, EFFECT_TYPES.FREEZE);
            expect(manager.heroHasEffect(EFFECT_TYPES.FREEZE)).toBe(false);
        });

        it('getHeroEffects should return effects array', () => {
            manager.applyToHero(hero, EFFECT_TYPES.SHIELD);
            const effects = manager.getHeroEffects();
            expect(Array.isArray(effects)).toBe(true);
            expect(effects.length).toBeGreaterThan(0);
        });

        it('clear should remove all effects', () => {
            manager.applyToHero(hero, EFFECT_TYPES.BURN);
            manager.applyToEnemy(enemy, EFFECT_TYPES.STUN);
            manager.clear();
            expect(manager.heroHasEffect(EFFECT_TYPES.BURN)).toBe(false);
        });
    });

    describe('Effect types', () => {
        it('STUN effect should have correct properties', () => {
            const effect = new StatusEffect(EFFECT_TYPES.STUN, hero);
            expect(effect.name).toBe('Betäubt');
        });

        it('BURN effect should be stackable', () => {
            const effect = new StatusEffect(EFFECT_TYPES.BURN, hero);
            expect(effect.stackable).toBe(true);
        });

        it('SHIELD effect should handle damage', () => {
            const effect = new StatusEffect(EFFECT_TYPES.SHIELD, hero);
            expect(effect.onDamageTaken).toBeDefined();
        });
    });
});
