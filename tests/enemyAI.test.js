
import { describe, it, expect, beforeEach } from './testRunner.js';
import { EnemyAI, ENEMY_ABILITIES } from '../js/enemyAI.js';
import { ENEMY_TYPES } from '../js/enemy.js';

describe('EnemyAI', () => {
    let enemyAI;
    let mockGame;

    beforeEach(() => {
        mockGame = {};
        enemyAI = new EnemyAI(mockGame);
    });

    describe('generateEnemy', () => {
        it('should generate ORC on plains at low level', () => {
            const orc = enemyAI.generateEnemy('plains', 1);
            expect(orc.type).toBe(ENEMY_TYPES.ORC);
        });

        it('should generate DRACONUM on mountain at high difficulty', () => {
            enemyAI.difficulty = 5;
            const dragon = enemyAI.generateEnemy('mountain', 10);
            expect(dragon.type).toBe(ENEMY_TYPES.DRACONUM);
        });

        it('should generate ELEMENTAL on wasteland at medium difficulty', () => {
            enemyAI.difficulty = 3;
            const elemental = enemyAI.generateEnemy('wasteland', 6);
            expect(elemental.type).toBe(ENEMY_TYPES.ELEMENTAL);
        });

        it('should generate NECROMANCER in swamp at high difficulty', () => {
            enemyAI.difficulty = 4;
            const necro = enemyAI.generateEnemy('swamp', 10);
            expect(necro.type).toBe(ENEMY_TYPES.NECROMANCER);
        });

        it('should generate ROBBER in forest', () => {
            enemyAI.difficulty = 2;
            const robber = enemyAI.generateEnemy('forest', 5);
            expect(robber.type).toBe(ENEMY_TYPES.ROBBER);
        });

        it('should scale enemy stats with difficulty', () => {
            const level1 = enemyAI.generateEnemy('plains', 1);
            const level10 = enemyAI.generateEnemy('plains', 20);

            expect(level10.attack).toBeGreaterThan(level1.attack);
            expect(level10.armor).toBeGreaterThan(level1.armor);
        });

        it('should add abilities at high difficulty', () => {
            enemyAI.difficulty = 5;
            const enemy = enemyAI.generateEnemy('swamp', 20);
            expect(enemy.abilities.length).toBeGreaterThan(0);
        });

        it('should fallback to ORC for unknown terrain', () => {
            const enemy = enemyAI.generateEnemy('unknown_terrain', 1);
            expect(enemy.type).toBe(ENEMY_TYPES.ORC);
        });

        it('should set currentHealth equal to armor', () => {
            const enemy = enemyAI.generateEnemy('plains', 5);
            expect(enemy.currentHealth).toBe(enemy.armor);
        });
    });

    describe('decideAction', () => {
        it('should return attack action', () => {
            const enemy = { attack: 5, abilities: [] };
            const action = enemyAI.decideAction(enemy, {});

            expect(action.type).toBe('attack');
            expect(action.value).toBe(5);
        });

        it('should include enemy abilities', () => {
            const enemy = { attack: 3, abilities: [ENEMY_ABILITIES.POISON] };
            const action = enemyAI.decideAction(enemy, {});

            expect(action.abilities).toContain(ENEMY_ABILITIES.POISON);
        });
    });

    describe('applyAbility', () => {
        it('should apply POISON effect', () => {
            const result = enemyAI.applyAbility(ENEMY_ABILITIES.POISON, {}, {});

            expect(result.effect).toBe('wound');
            expect(result.count).toBe(1);
        });

        it('should apply FIRE effect', () => {
            const result = enemyAI.applyAbility(ENEMY_ABILITIES.FIRE, {}, {});

            expect(result.effect).toBe('damage_boost');
        });

        it('should apply VAMPIRIC effect and heal source', () => {
            const source = { currentHealth: 5, maxHealth: 10 };
            const result = enemyAI.applyAbility(ENEMY_ABILITIES.VAMPIRIC, {}, source);

            expect(result.effect).toBe('heal');
            expect(source.currentHealth).toBe(6);
        });

        it('should not heal source above maxHealth', () => {
            const source = { currentHealth: 10, maxHealth: 10 };
            enemyAI.applyAbility(ENEMY_ABILITIES.VAMPIRIC, {}, source);

            expect(source.currentHealth).toBe(10);
        });

        it('should return null for unknown ability', () => {
            const result = enemyAI.applyAbility('unknown', {}, {});
            expect(result).toBeNull();
        });
    });
});
