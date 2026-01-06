import { describe, it, expect, beforeEach } from 'vitest';
import { EnemyAI } from '../js/enemyAI.js';
import { HexGrid } from '../js/hexgrid.js';
import { createMockCanvas, createMockContext } from './test-mocks.js';
import { ENEMY_TYPES } from '../js/enemy.js';

describe('Enemy AI Movement', () => {
    let enemyAI;
    let mockGame;
    let mockHexGrid;

    beforeEach(() => {
        const canvas = createMockCanvas();
        mockHexGrid = new HexGrid(canvas);

        // Setup basic grid 3x3
        // (0,0) center
        // (1,0) -1,0, 0,1, 1,-1...
        mockHexGrid.setHex(0, 0, { terrain: 'plains' });
        mockHexGrid.setHex(1, 0, { terrain: 'plains' });
        mockHexGrid.setHex(2, 0, { terrain: 'plains' });
        mockHexGrid.setHex(0, 1, { terrain: 'plains' });

        mockGame = {
            hexGrid: mockHexGrid
        };

        enemyAI = new EnemyAI(mockGame);
    });

    it('should identify movable enemies', () => {
        const orc = { type: ENEMY_TYPES.ORC };
        const tower = { type: ENEMY_TYPES.MAGE_TOWER };

        expect(enemyAI.canMove(orc)).toBe(true);
        expect(enemyAI.canMove(tower)).toBe(false);
    });

    it('should calculate best move towards hero (aggro)', () => {
        const enemy = {
            type: ENEMY_TYPES.ORC,
            position: { q: 2, r: 0 },
            name: 'Orc'
        };
        const heroPos = { q: 0, r: 0 }; // 2 steps away

        // Distance 2,0 to 0,0 is 2. (2,0 -> 1,0 -> 0,0)
        // Neighbors of 2,0: 1,0 (dist 1), 3,0 (dist 3) etc.
        // We ensure 1,0 exists
        mockHexGrid.setHex(1, 0, { terrain: 'plains' });

        const move = enemyAI.getBestMove(enemy, heroPos, [enemy]);

        expect(move).toBeDefined();
        // Should move to 1,0 which is closer to 0,0
        expect(move.q).toBe(1);
        expect(move.r).toBe(0);
    });

    it('should avoid obstacles', () => {
        const enemy = {
            type: ENEMY_TYPES.ORC,
            position: { q: 2, r: 0 },
            name: 'Orc'
        };
        const heroPos = { q: 0, r: 0 };

        // 1,0 is water -> Invalid
        mockHexGrid.setHex(1, 0, { terrain: 'water' });

        // 2,1 is plains -> Valid detour?
        mockHexGrid.setHex(2, 1, { terrain: 'plains' });

        const move = enemyAI.getBestMove(enemy, heroPos, [enemy]);

        // Should NOT be 1,0
        if (move) {
            expect(move.q !== 1 || move.r !== 0).toBe(true);
        }
    });

    it('should update enemies list', () => {
        const enemy = {
            type: ENEMY_TYPES.ORC,
            position: { q: 2, r: 0 },
            name: 'Orc',
            currentHealth: 2,
            maxHealth: 5
        };
        const enemies = [enemy];
        const hero = { position: { q: 0, r: 0 } };

        mockHexGrid.setHex(1, 0, { terrain: 'plains' });

        const logs = enemyAI.updateEnemies(enemies, hero);

        // Check health regen
        expect(enemy.currentHealth).toBe(3);

        // Check movement log
        expect(logs.length).toBeGreaterThan(0);
        expect(enemy.position.q).toBe(1); // Moved towards hero
    });
});
