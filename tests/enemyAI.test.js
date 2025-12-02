
import { describe, it, expect, beforeEach } from './testRunner.js';
import { EnemyAI, ENEMY_ABILITIES } from '../js/enemyAI.js';
import { Enemy, ENEMY_TYPES } from '../js/enemy.js';

describe('EnemyAI', () => {
    let enemyAI;
    let mockGame;

    beforeEach(() => {
        mockGame = {};
        enemyAI = new EnemyAI(mockGame);
    });

    it('should generate enemies based on terrain', () => {
        const orc = enemyAI.generateEnemy('plains', 1);
        expect(orc.type).toBe(ENEMY_TYPES.ORC);

        const dragon = enemyAI.generateEnemy('mountain', 10);
        expect(dragon.type).toBe(ENEMY_TYPES.DRACONUM); // High difficulty mountain
    });

    it('should scale enemy stats with difficulty', () => {
        const level1 = enemyAI.generateEnemy('plains', 1);
        const level10 = enemyAI.generateEnemy('plains', 20); // High level input

        expect(level10.attack).toBeGreaterThan(level1.attack);
        expect(level10.armor).toBeGreaterThan(level1.armor);
    });

    it('should add abilities at high difficulty', () => {
        // Force high difficulty
        enemyAI.difficulty = 5;
        const enemy = enemyAI.generateEnemy('swamp', 20);

        // Should have abilities (Necromancer or similar)
        expect(enemy.abilities.length).toBeGreaterThan(0);
    });

    it('should fallback to Orc for unknown terrain', () => {
        const enemy = enemyAI.generateEnemy('unknown_terrain', 1);
        expect(enemy.type).toBe(ENEMY_TYPES.ORC);
    });
});
