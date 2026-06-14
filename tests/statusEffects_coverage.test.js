import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    StatusEffectManager, 
    StatusEffect, 
    EFFECT_TYPES, 
    EFFECT_DEFINITIONS 
} from '../js/statusEffects.js';

describe('StatusEffectManager - Coverage Boost', () => {
    let manager;
    let mockHero;
    let mockEnemy;

    beforeEach(() => {
        manager = new StatusEffectManager();
        
        mockHero = { 
            id: 'hero', 
            name: 'Hero', 
            statusEffects: [] 
        };
        
        mockEnemy = { 
            id: 'enemy1', 
            name: 'Enemy', 
            arcaneImmune: false,
            statusEffects: [] 
        };
    });

    describe('EFFECT_DEFINITIONS', () => {
        it('should have definitions for all effect types', () => {
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.STUN]).toBeDefined();
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.BURN]).toBeDefined();
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.FREEZE]).toBeDefined();
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.POISON]).toBeDefined();
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.WEAKEN]).toBeDefined();
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.SHIELD]).toBeDefined();
            expect(EFFECT_DEFINITIONS[EFFECT_TYPES.ENRAGE]).toBeDefined();
        });

        it('should have correct properties for each effect', () => {
            Object.values(EFFECT_TYPES).forEach(type => {
                const def = EFFECT_DEFINITIONS[type];
                expect(def.name).toBeDefined();
                expect(def.icon).toBeDefined();
                expect(typeof def.duration).toBe('number');
                expect(typeof def.stackable).toBe('boolean');
                expect(typeof def.maxStacks).toBe('number');
            });
        });
    });

    describe('StatusEffect class', () => {
        it('should create effect with correct properties', () => {
            const effect = new StatusEffect(EFFECT_TYPES.BURN, mockHero);
            
            expect(effect.type).toBe(EFFECT_TYPES.BURN);
            expect(effect.name).toBe('Brennend');
            expect(effect.icon).toBe('🔥');
            expect(effect.duration).toBe(3);
            expect(effect.remainingDuration).toBe(3);
            expect(effect.stackable).toBe(true);
            expect(effect.maxStacks).toBe(3);
            expect(effect.stacks).toBe(1);
            expect(effect.target).toBe(mockHero);
        });

        it('should handle permanent duration (-1)', () => {
            const effect = new StatusEffect(EFFECT_TYPES.POISON, mockHero);
            expect(effect.remainingDuration).toBe(-1);
        });

        it('should add stack when stackable and under max', () => {
            const effect = new StatusEffect(EFFECT_TYPES.BURN, mockHero);
            const result = effect.addStack();
            
            expect(result).toBe(true);
            expect(effect.stacks).toBe(2);
        });

        it('should not add stack when not stackable', () => {
            const effect = new StatusEffect(EFFECT_TYPES.STUN, mockHero);
            const result = effect.addStack();
            
            expect(result).toBe(false);
            expect(effect.stacks).toBe(1);
        });

        it('should not add stack when at max stacks', () => {
            const effect = new StatusEffect(EFFECT_TYPES.BURN, mockHero);
            effect.stacks = 3; // max stacks
            
            const result = effect.addStack();
            
            expect(result).toBe(false);
            expect(effect.stacks).toBe(3);
        });

        it('should tick down remaining duration', () => {
            const effect = new StatusEffect(EFFECT_TYPES.BURN, mockHero);
            effect.tick();
            
            expect(effect.remainingDuration).toBe(2);
        });

        it('should not tick below 0', () => {
            const effect = new StatusEffect(EFFECT_TYPES.BURN, mockHero);
            effect.remainingDuration = 0;
            effect.tick();
            
            expect(effect.remainingDuration).toBe(0);
        });

        it('should not tick permanent effects', () => {
            const effect = new StatusEffect(EFFECT_TYPES.POISON, mockHero);
            effect.tick();
            
            expect(effect.remainingDuration).toBe(-1);
        });

        it('should report expired when remainingDuration is 0', () => {
            const effect = new StatusEffect(EFFECT_TYPES.BURN, mockHero);
            effect.remainingDuration = 0;
            
            expect(effect.isExpired()).toBe(true);
        });

        it('should not report expired when remainingDuration > 0', () => {
            const effect = new StatusEffect(EFFECT_TYPES.BURN, mockHero);
            
            expect(effect.isExpired()).toBe(false);
        });

        it('should not report expired for permanent effects', () => {
            const effect = new StatusEffect(EFFECT_TYPES.POISON, mockHero);
            
            expect(effect.isExpired()).toBe(false);
        });

        it('should use defaults for unknown effect type', () => {
            const effect = new StatusEffect('unknown_type', mockHero);
            
            expect(effect.name).toBe('unknown_type');
            expect(effect.icon).toBe('?');
            expect(effect.duration).toBe(1);
            expect(effect.remainingDuration).toBe(1);
        });
    });

    describe('applyToHero', () => {
        it('should apply new effect to hero', () => {
            const result = manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
            
            expect(result.success).toBe(true);
            expect(result.applied).toBe(true);
            expect(result.stacked).toBe(false);
            expect(result.effect).toBeDefined();
            expect(manager.heroEffects.has(EFFECT_TYPES.BURN)).toBe(true);
        });

        it('should stack existing effect', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
            const result = manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
            
            expect(result.success).toBe(true);
            expect(result.applied).toBe(false);
            expect(result.stacked).toBe(true);
            expect(manager.heroEffects.get(EFFECT_TYPES.BURN).stacks).toBe(2);
        });

        it('should not stack non-stackable effect', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.STUN);
            const result = manager.applyToHero(mockHero, EFFECT_TYPES.STUN);
            
            expect(result.success).toBe(true);
            expect(result.stacked).toBe(false);
            expect(manager.heroEffects.get(EFFECT_TYPES.STUN).stacks).toBe(1);
        });

        it('should not exceed max stacks', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
            manager.heroEffects.get(EFFECT_TYPES.BURN).stacks = 3; // max
            const result = manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
            
            expect(result.stacked).toBe(false);
            expect(manager.heroEffects.get(EFFECT_TYPES.BURN).stacks).toBe(3);
        });
    });

    describe('applyToEnemy', () => {
        it('should apply new effect to enemy', () => {
            const result = manager.applyToEnemy(mockEnemy, EFFECT_TYPES.BURN);
            
            expect(result.success).toBe(true);
            expect(result.applied).toBe(true);
            expect(result.stacked).toBe(false);
            expect(manager.enemyEffects.has(mockEnemy.id)).toBe(true);
            expect(manager.enemyEffects.get(mockEnemy.id).length).toBe(1);
        });

        it('should stack existing effect', () => {
            manager.applyToEnemy(mockEnemy, EFFECT_TYPES.BURN);
            const result = manager.applyToEnemy(mockEnemy,  EFFECT_TYPES.BURN);
            
            expect(result.success).toBe(true);
            expect(result.stacked).toBe(true);
            expect(manager.enemyEffects.get(mockEnemy.id)[0].stacks).toBe(2);
        });

        it('should block effect on arcane immune enemy', () => {
            mockEnemy.arcaneImmune = true;
            
            const result = manager.applyToEnemy(mockEnemy, EFFECT_TYPES.POISON);
            
            expect(result.success).toBe(false);
            expect(result.blocked).toBe(true);
            expect(result.reason).toBe('arcane_immune');
            expect(result.message).toContain('immun');
        });

        it('should block burn on arcane immune', () => {
            mockEnemy.arcaneImmune = true;
            const result = manager.applyToEnemy(mockEnemy, EFFECT_TYPES.BURN);
            expect(result.success).toBe(false);
        });

        it('should block freeze on arcane immune', () => {
            mockEnemy.arcaneImmune = true;
            const result = manager.applyToEnemy(mockEnemy, EFFECT_TYPES.FREEZE);
            expect(result.success).toBe(false);
        });

        it('should block weaken on arcane immune', () => {
            mockEnemy.arcaneImmune = true;
            const result = manager.applyToEnemy(mockEnemy, EFFECT_TYPES.WEAKEN);
            expect(result.success).toBe(false);
        });

        it('should block shield on arcane immune', () => {
            mockEnemy.arcaneImmune = true;
            const result = manager.applyToEnemy(mockEnemy, EFFECT_TYPES.SHIELD);
            expect(result.success).toBe(false);
        });

        it('should block enrage on arcane immune', () => {
            mockEnemy.arcaneImmune = true;
            const result = manager.applyToEnemy(mockEnemy, EFFECT_TYPES.ENRAGE);
            expect(result.success).toBe(false);
        });

        it('should ALLOW stun on arcane immune', () => {
            mockEnemy.arcaneImmune = true;
            const result = manager.applyToEnemy(mockEnemy, EFFECT_TYPES.STUN);
            
            expect(result.success).toBe(true);
            expect(result.blocked).toBeUndefined();
        });

        it('should create enemy effects map if not exists', () => {
            const newEnemy = { id: 'enemy2', name: 'Enemy2', arcaneImmune: false, statusEffects: [] };
            manager.applyToEnemy(newEnemy, EFFECT_TYPES.POISON);
            
            expect(manager.enemyEffects.has('enemy2')).toBe(true);
        });
    });

    describe('heroHasEffect', () => {
        it('should return true when hero has effect', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
            expect(manager.heroHasEffect(EFFECT_TYPES.BURN)).toBe(true);
        });

        it('should return false when hero does not have effect', () => {
            expect(manager.heroHasEffect(EFFECT_TYPES.BURN)).toBe(false);
        });
    });

    describe('enemyHasEffect', () => {
        it('should return true when enemy has effect', () => {
            manager.applyToEnemy(mockEnemy, EFFECT_TYPES.POISON);
            expect(manager.enemyHasEffect(mockEnemy, EFFECT_TYPES.POISON)).toBe(true);
        });

        it('should return false when enemy does not have effect', () => {
            expect(manager.enemyHasEffect(mockEnemy, EFFECT_TYPES.POISON)).toBe(false);
        });

        it('should return false for enemy with no effects map', () => {
            const newEnemy = { id: 'new', name: 'New', arcaneImmune: false };
            expect(manager.enemyHasEffect(newEnemy, EFFECT_TYPES.POISON)).toBe(false);
        });
    });

    describe('removeFromHero', () => {
        it('should remove effect from hero', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
            manager.removeFromHero(mockHero, EFFECT_TYPES.BURN);
            
            expect(manager.heroHasEffect(EFFECT_TYPES.BURN)).toBe(false);
        });

        it('should not throw for non-existent effect', () => {
            expect(() => manager.removeFromHero(mockHero, EFFECT_TYPES.BURN)).not.toThrow();
        });
    });

    describe('getHeroEffects', () => {
        it('should return all hero effects', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
            manager.applyToHero(mockHero, EFFECT_TYPES.POISON);
            
            const effects = manager.getHeroEffects();
            
            expect(effects.length).toBe(2);
            expect(effects.map(e => e.type)).toContain(EFFECT_TYPES.BURN);
            expect(effects.map(e => e.type)).toContain(EFFECT_TYPES.POISON);
        });

        it('should return empty array when no effects', () => {
            expect(manager.getHeroEffects()).toEqual([]);
        });
    });

    describe('getEnemyEffects', () => {
        it('should return all enemy effects', () => {
            manager.applyToEnemy(mockEnemy, EFFECT_TYPES.POISON);
            manager.applyToEnemy(mockEnemy, EFFECT_TYPES.BURN);
            
            const effects = manager.getEnemyEffects(mockEnemy);
            
            expect(effects.length).toBe(2);
        });

        it('should return empty array for enemy with no effects', () => {
            expect(manager.getEnemyEffects(mockEnemy)).toEqual([]);
        });
    });

    describe('processHeroPhaseStart', () => {
        it('should apply burn damage per stack', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
            manager.heroEffects.get(EFFECT_TYPES.BURN).stacks = 3;
            
            const result = manager.processHeroPhaseStart(mockHero);
            
            expect(result.damage).toBe(3);
        });

        it('should tick all effects', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
            const initialDuration = manager.heroEffects.get(EFFECT_TYPES.BURN).remainingDuration;
            
            manager.processHeroPhaseStart(mockHero);
            
            expect(manager.heroEffects.get(EFFECT_TYPES.BURN).remainingDuration).toBe(initialDuration - 1);
        });

        it('should remove expired effects', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.STUN); // duration 1
            manager.heroEffects.get(EFFECT_TYPES.STUN).remainingDuration = 1;
            
            manager.processHeroPhaseStart(mockHero);
            
            expect(manager.heroHasEffect(EFFECT_TYPES.STUN)).toBe(false);
        });

        it('should not remove permanent effects', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.POISON);
            
            manager.processHeroPhaseStart(mockHero);
            
            expect(manager.heroHasEffect(EFFECT_TYPES.POISON)).toBe(true);
        });

        it('should return damage 0 when no burn', () => {
            const result = manager.processHeroPhaseStart(mockHero);
            expect(result.damage).toBe(0);
        });
    });

    describe('processEnemyPhaseStart', () => {
        it('should return empty array (not implemented)', () => {
            const result = manager.processEnemyPhaseStart([mockEnemy]);
            expect(result).toEqual([]);
        });
    });

    describe('processCombatEnd', () => {
        it('should return poison stacks as wounds', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.POISON);
            manager.heroEffects.get(EFFECT_TYPES.POISON).stacks = 2;
            
            const result = manager.processCombatEnd(mockHero);
            
            expect(result.wounds).toBe(2);
        });

        it('should return 0 wounds when no poison', () => {
            const result = manager.processCombatEnd(mockHero);
            expect(result.wounds).toBe(0);
        });
    });

    describe('clear', () => {
        it('should clear all hero and enemy effects', () => {
            manager.applyToHero(mockHero, EFFECT_TYPES.BURN);
            manager.applyToEnemy(mockEnemy, EFFECT_TYPES.POISON);
            
            manager.clear();
            
            expect(manager.heroEffects.size).toBe(0);
            expect(manager.enemyEffects.size).toBe(0);
        });
    });

    describe('static methods', () => {
        it('should apply effect to unit', () => {
            const unit = { statusEffects: [] };
            StatusEffectManager.applyEffect(unit, 'custom_effect');
            
            expect(unit.statusEffects).toContain('custom_effect');
        });

        it('should initialize statusEffects array if missing', () => {
            const unit = {};
            StatusEffectManager.applyEffect(unit, 'custom_effect');
            
            expect(unit.statusEffects).toEqual(['custom_effect']);
        });

        it('should check if unit has effect', () => {
            const unit = { statusEffects: ['effect1', 'effect2'] };
            
            expect(StatusEffectManager.hasEffect(unit, 'effect1')).toBe(true);
            expect(StatusEffectManager.hasEffect(unit, 'effect3')).toBe(false);
        });

        it('should return false when no statusEffects array', () => {
            const unit = {};
            expect(StatusEffectManager.hasEffect(unit, 'effect1')).toBe(false);
        });
    });
});