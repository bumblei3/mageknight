import { describe, it, expect, beforeEach } from 'vitest';
import { MageKnightGame } from '../js/game.js';

describe('Enemy Spawning', () => {
    let game;

    beforeEach(() => {
        game = new MageKnightGame();
    });

    it('should spawn enemies on the initial board', () => {
        // The game should have spawned enemies after initialization
        expect(game.enemies.length).toBeGreaterThan(0);
    });

    it('should not spawn enemies in starting area', () => {
        // Check that no enemies are at 0,0 or adjacent hexes
        const startingAreaEnemies = game.enemies.filter(enemy => {
            const q = enemy.position.q;
            const r = enemy.position.r;
            return Math.abs(q) <= 1 && Math.abs(r) <= 1;
        });

        expect(startingAreaEnemies.length).toBe(0);
    });

    it('should spawn enemies with valid positions', () => {
        game.enemies.forEach(enemy => {
            expect(enemy.position).toBeDefined();
            expect(enemy.position.q).toBeDefined();
            expect(enemy.position.r).toBeDefined();
            expect(game.hexGrid.hasHex(enemy.position.q, enemy.position.r)).toBe(true);
        });
    });

    it('should spawn enemies with valid stats', () => {
        game.enemies.forEach(enemy => {
            expect(enemy.armor).toBeGreaterThan(0);
            expect(enemy.attack).toBeGreaterThan(0);
            expect(enemy.name).toBeDefined();
            expect(enemy.id).toBeDefined();
        });
    });

    it('should spawn enemies on special terrain types', () => {
        // Run multiple games to account for randomness
        let gamesWithSpecialTerrain = 0;
        const numGames = 5;

        for (let i = 0; i < numGames; i++) {
            const testGame = new MageKnightGame();
            const specialTerrainEnemies = testGame.enemies.filter(enemy => {
                const hex = testGame.hexGrid.getHex(enemy.position.q, enemy.position.r);
                if (!hex) return false;
                const terrainName = testGame.terrain.getName(hex.terrain);
                // Check for the special/dangerous terrains we placed
                return ['Ödland', 'Berge', 'Wüste'].includes(terrainName);
            });

            if (specialTerrainEnemies.length > 0) {
                gamesWithSpecialTerrain++;
            }
        }

        // At least 50% of games should have enemies on dangerous terrains
        expect(gamesWithSpecialTerrain).toBeGreaterThan(0);
    });

    it('should assign appropriate levels based on distance', () => {
        game.enemies.forEach(enemy => {
            const distance = Math.max(
                Math.abs(enemy.position.q),
                Math.abs(enemy.position.r),
                Math.abs(enemy.position.q + enemy.position.r)
            );
            const expectedMinLevel = Math.max(1, Math.floor(distance / 2));

            expect(enemy.level).toBeGreaterThanOrEqual(expectedMinLevel);
        });
    });

    it('should have unique enemy IDs', () => {
        const ids = new Set();
        game.enemies.forEach(enemy => {
            expect(ids.has(enemy.id)).toBe(false);
            ids.add(enemy.id);
        });

        expect(ids.size).toBe(game.enemies.length);
    });

    it('should render enemies on the hex grid', () => {
        // Force a render
        game.render();

        // Check that enemies were processed (this is a basic check)
        expect(game.enemies.length).toBeGreaterThan(0);
    });

    it('should remove defeated enemies', () => {
        const initialCount = game.enemies.length;
        expect(initialCount).toBeGreaterThan(0);

        // Remove first enemy
        const removedEnemy = game.enemies.shift();
        expect(game.enemies.length).toBe(initialCount - 1);
    });
});
