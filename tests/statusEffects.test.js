
import { describe, it, expect, beforeEach } from 'vitest';
import { StatusEffectManager, StatusEffect, EFFECT_TYPES, EFFECT_DEFINITIONS } from '../js/statusEffects.js';

describe('Status Effects System', () => {
    let manager;
    let mockHero;
    let mockEnemy;

    beforeEach(() => {
        manager = new StatusEffectManager();
        mockHero = {
            stunned: false,
            blockModifier: 1.0,
            attackModifier: 0,
            enraged: false
        };
        mockEnemy = {
            id: 'enemy_1',
            name: 'Test Orc',
            stunned: false,
            blockModifier: 1.0,
            attackModifier: 0
        };
    });

    describe('Effect Definitions', () => {
        it('should have all required effect types defined', () => {
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.STUN]).toBeDefined();
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.BURN]).toBeDefined();
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.FREEZE]).toBeDefined();
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.POISON]).toBeDefined();
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.WEAKEN]).toBeDefined();
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.SHIELD]).toBeDefined();
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.ENRAGE]).toBeDefined();
        });
    });

    describe('StatusEffect Class', () => {
        it('should create effect with correct properties', () => {
            const effect = new StatusEffect(EFFECT_TYPES.BURN, mockHero);
            expect(effect.type).toBe(EFFECT_TYPES.BURN);
            expect(effect.name).toBe('Brennend');
            expect(effect.icon).toBe('🔥');
            expect(effect.stacks).toBe(1);
            expect(effect.remainingDuration).toBe(3);
        });

        it('should stack when stackable', () => {
            const effect = new StatusEffect(EFFECT_TYPES.BURN, mockHero);
            expect(effect.stacks).toBe(1);
            effect.addStack();
            expect(effect.stacks).toBe(2);
            effect.addStack();
            expect(effect.stacks).toBe(3);
            // Should not exceed max stacks
            const added = effect.addStack();
            expect(added).toBe(false);
            expect(effect.stacks).toBe(3);
        });

        it('should not stack when not stackable', () => {
            const effect = new StatusEffect(EFFECT_TYPES.STUN, mockHero);
            expect(effect.stackable).toBe(false);
            const added = effect.addStack();
            expect(added).toBe(false);
            expect(effect.stacks).toBe(1);
        });

        it('should tick duration correctly', () => {
            const effect = new StatusEffect(EFFECT_TYPES.FREEZE, mockHero);
            expect(effect.remainingDuration).toBe(2);
            effect.tick();
            expect(effect.remainingDuration).toBe(1);
            effect.tick();
            expect(effect.remainingDuration).toBe(0);
            expect(effect.isExpired()).toBe(true);
        });

        it('should handle permanent effects (duration -1)', () => {
            const effect = new StatusEffect(EFFECT_TYPES.POISON, mockHero);
            expect(effect.duration).toBe(-1);
            effect.tick();
            effect.tick();
            expect(effect.isExpired()).toBe(false);
        });
    });

    describe('StatusEffectManager', () => {
        describe('applyToHero', () => {
            it('should apply effect to hero', () => {
                const result = manager.applyToHero(mockHero, EFFECT_TYPES.STUN);
                expect(result.success).toBe(true);
                expect(result.applied).toBe(true);
                expect(manager.heroHasEffect(EFFECT_TYPES.STUN)).toBe(true);
            });

            it('should apply effect to enemy', () => {
                const result = manager.applyToEnemy(mockEnemy, EFFECT_TYPES.BURN);
                expect(result.success).toBe(true);
                expect(manager.enemyHasEffect(mockEnemy, EFFECT_TYPES.BURN)).toBe(true);
            });

            it('should stack existing effects', () => {
                manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
                const result = manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
                expect(result.success).toBe(true);
                expect(result.stacked).toBe(true);
                expect(result.effect.stacks).toBe(2);
            });

            it('should remove effects from hero', () => {
                manager.applyToHero(mockHero, EFFECT_TYPES.FREEZE);
                expect(manager.heroHasEffect(EFFECT_TYPES.FREEZE)).toBe(true);
                manager.removeFromHero(mockHero, EFFECT_TYPES.FREEZE);
                expect(manager.heroHasEffect(EFFECT_TYPES.FREEZE)).toBe(false);
            });

            it('should process phase start effects and deal damage', () => {
                manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
                manager.applyToHero(mockHero, EFFECT_TYPES.BURN); // 2 stacks
                const result = manager.processHeroPhaseStart(mockHero);
                expect(result).toBeDefined();
                expect(result.damage).toBe(2); // 2 stacks = 2 damage
            });

            it('should expire effects after duration', () => {
                manager.applyToHero(mockHero, EFFECT_TYPES.STUN); // Duration 1
                expect(manager.heroHasEffect(EFFECT_TYPES.STUN)).toBe(true);
                manager.processHeroPhaseStart(mockHero); // Tick
                expect(manager.heroHasEffect(EFFECT_TYPES.STUN)).toBe(false);
            });
        });

        it('should clear all effects', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
            manager.applyToEnemy(mockEnemy, EFFECT_TYPES.FREEZE);
            manager.clear();
            expect(manager.getHeroEffects().length).toBe(0);
            expect(manager.getEnemyEffects(mockEnemy).length).toBe(0);
        });

        it('should process combat end for poison', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.POISON);
            manager.applyToHero(mockHero, EFFECT_TYPES.POISON); // 2 stacks
            const result = manager.processCombatEnd(mockHero);
            expect(result.wounds).toBe(2);
        });
    });
});
