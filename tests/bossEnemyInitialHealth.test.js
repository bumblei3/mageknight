import { describe, it, expect } from 'vitest';
import { BossEnemy } from '../js/enemy.js';

describe('BossEnemy initial health', () => {
    it('respects currentHealth = 0 (does not fall back to maxHealth)', () => {
        const boss = new BossEnemy({
            id: 'test_boss',
            name: 'Test Boss',
            type: 'custom',
            maxHealth: 20,
            currentHealth: 0,
            attack: 5,
            armor: 3,
            fame: 10,
        });
        expect(boss.currentHealth).toBe(0);
        expect(boss.maxHealth).toBe(20);
    });

    it('falls back to maxHealth when currentHealth is omitted', () => {
        const boss = new BossEnemy({
            id: 'test_boss_2',
            name: 'Test Boss 2',
            type: 'custom',
            maxHealth: 25,
            attack: 5,
            armor: 3,
            fame: 10,
        });
        expect(boss.currentHealth).toBe(25);
    });
});
