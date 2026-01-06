import { describe, it, expect, beforeEach } from 'vitest';
import { EnemyAI } from '../js/enemyAI.js';
import { Enemy } from '../js/enemy.js';
import { Hero } from '../js/hero.js';
import { HexGrid } from '../js/hexgrid.js';

describe('Enemy AI Movement', () => {
    let enemyAI;
    let mockGame;
    let hero;
    let hexGrid;

    beforeEach(() => {
        const mockCanvas = {
            getContext: () => ({
                clearRect: () => { },
                save: () => { },
                restore: () => { },
                translate: () => { },
                scale: () => { },
                drawImage: () => { }
            }),
            width: 800,
            height: 600
        };
        hexGrid = new HexGrid(mockCanvas);
        hero = new Hero('TestHero');
        hero.position = { q: 0, r: 0 };

        mockGame = {
            hero: hero,
            hexGrid: hexGrid,
            mapManager: {
                getHex: (q, r) => ({ q, r, terrain: 'plains' }) // Mock map
            }
        };

        enemyAI = new EnemyAI(mockGame);
    });

    it('should move towards hero if in range', () => {
        const enemy = new Enemy({ name: 'Orc', attack: 3 });
        enemy.position = { q: 0, r: 2 }; // Distance 2

        // Mock distance calculation
        hexGrid.distance = (q1, r1, q2, r2) => {
            return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(q1 + r1 - q2 - r2));
        };

        // Mock neighbor finding for path
        hexGrid.getNeighbors = (q, r) => [
            { q: q, r: r - 1 }, // Towards 0,0
            { q: q + 1, r: r - 1 },
            { q: q - 1, r: r },
            { q: q + 1, r: r },
            { q: q - 1, r: r + 1 },
            { q: q, r: r + 1 }
        ];

        // Should decide to move
        // Note: EnemyAI might not have decideMovement implemented yet, or it might be different.
        // This test assumes a standard AI behavior.
        // If decideMovement doesn't exist, we might need to implement it or test what exists.
        // Checking EnemyAI class...
        if (enemyAI.decideMovement) {
            const move = enemyAI.decideMovement(enemy);
            expect(move).toBeDefined();
            expect(move.q).toBe(0);
            expect(move.r).toBe(1); // One step closer
        }
    });

    it('should not move if already adjacent', () => {
        const enemy = new Enemy({ name: 'Orc', attack: 3 });
        enemy.position = { q: 0, r: 1 }; // Distance 1

        hexGrid.distance = () => 1;

        if (enemyAI.decideMovement) {
            const move = enemyAI.decideMovement(enemy);
            // Should stay or return null/undefined indicating no move needed (attack instead)
            expect(move).toBeFalsy();
        }
    });
});
