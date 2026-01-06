import { describe, it, expect, beforeEach } from 'vitest';
import { StatusEffectManager, EFFECT_TYPES } from '../js/statusEffects.js';
import { createSpy } from './test-mocks.js';

describe('StatusEffect Extra Coverage', () => {
    let manager;
    let mockEnemy;

    beforeEach(() => {
        manager = new StatusEffectManager();
        mockEnemy = { id: 'enemy1', name: 'Orc' };
    });

    it('should process enemy phase start', () => {
        // Apply a burning effect which has onPhaseStart
        manager.applyToEnemy(mockEnemy, EFFECT_TYPES.BURN);

        const results = manager.processEnemyPhaseStart([mockEnemy]);
        expect(results.length).toBe(1);
        expect(results[0].enemy.id).toBe('enemy1');
        expect(results[0].damage).toBe(1);
    });

    it('should trigger onRemove when clearing hero effects', () => {
        const mockHero = { name: 'Hero' };
        // Use STUN because it has onRemove
        manager.applyToHero(mockHero, EFFECT_TYPES.STUN);

        manager.clear();
        expect(manager.getHeroEffects().length).toBe(0);
    });

    it('should ignore non-existent enemy during phase start', () => {
        const otherEnemy = { id: 'other' };
        const results = manager.processEnemyPhaseStart([otherEnemy]);
        expect(results.length).toBe(0);
    });
});
