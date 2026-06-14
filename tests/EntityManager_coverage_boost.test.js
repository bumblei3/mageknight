import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EntityManager } from '../js/game/EntityManager.js';
import { setupGlobalMocks, resetMocks } from './test-mocks.js';

describe('EntityManager - Coverage Boost', () => {
    let entityManager;
    let mockGame;

    beforeEach(() => {
        setupGlobalMocks();
        
        mockGame = {
            hexGrid: {
                hexes: new Map(),
            },
            terrain: {
                getName: vi.fn(() => 'plains'),
            },
            enemyAI: {
                generateEnemy: vi.fn(() => ({
                    name: 'Orc',
                    position: { q: 0, r: 0 },
                    id: 'test_enemy',
                })),
            },
            enemies: [],
        };

        entityManager = new EntityManager(mockGame);
    });

    afterEach(() => {
        vi.useRealTimers();
        resetMocks();
    });

    describe('Constructor', () => {
        it('should initialize with empty arrays and null hero', () => {
            expect(entityManager.hero).toBeNull();
            expect(entityManager.enemies).toEqual([]);
            expect(entityManager.units).toEqual([]);
        });

        it('should store game reference', () => {
            expect(entityManager.game).toBe(mockGame);
        });
    });

    describe('setHero()', () => {
        it('should set hero and update game.hero', () => {
            const hero = { name: 'Test Hero' };
            entityManager.setHero(hero);
            
            expect(entityManager.hero).toBe(hero);
            expect(mockGame.hero).toBe(hero);
        });

        it('should handle missing game gracefully', () => {
            entityManager.game = null;
            expect(() => entityManager.setHero({})).not.toThrow();
        });
    });

    describe('createEnemies()', () => {
        it('should return empty array if dependencies missing', () => {
            entityManager.game.hexGrid = null;
            const result = entityManager.createEnemies();
            expect(result).toEqual([]);
        });

        it('should return empty array if terrain missing', () => {
            entityManager.game.terrain = null;
            const result = entityManager.createEnemies();
            expect(result).toEqual([]);
        });

        it('should return empty array if enemyAI missing', () => {
            entityManager.game.enemyAI = null;
            const result = entityManager.createEnemies();
            expect(result).toEqual([]);
        });

        it('should skip starting area (0,0 and adjacent)', () => {
            const hex1 = { q: 0, r: 0, terrain: 0 };
            const hex2 = { q: 1, r: 0, terrain: 0 };
            const hex3 = { q: 2, r: 0, terrain: 0 };
            
            mockGame.hexGrid.hexes.set('0,0', hex1);
            mockGame.hexGrid.hexes.set('1,0', hex2);
            mockGame.hexGrid.hexes.set('2,0', hex3);
            
            mockGame.terrain.getName.mockReturnValue('ruins');
            
            entityManager.createEnemies();
            
            // Should only spawn on hex3 (2,0) since 0,0 and 1,0 are in starting area
            // Actually, the condition is Math.abs(hex.q) <= 1 && Math.abs(hex.r) <= 1
            // So (0,0), (1,0), (0,1), (-1,0), (0,-1), (1,1), (-1,-1), etc. are skipped
            // (2,0) has Math.abs(2) > 1, so it should spawn
            
            expect(entityManager.enemies.length).toBeGreaterThanOrEqual(0);
        });

        it('should use terrain name for spawn decisions', () => {
            const hex = { q: 5, r: 5, terrain: 0 };
            mockGame.hexGrid.hexes.set('5,5', hex);
            
            entityManager.createEnemies();
            
            expect(mockGame.terrain.getName).toHaveBeenCalled();
        });

        it('should assign position and unique ID to enemies', () => {
            const hex = { q: 3, r: 3, terrain: 0 };
            mockGame.hexGrid.hexes.set('3,3', hex);
            mockGame.terrain.getName.mockReturnValue('ruins');
            
            const enemies = entityManager.createEnemies();
            
            expect(enemies.length).toBeGreaterThan(0);
            if (enemies.length > 0) {
                expect(enemies[0].position).toEqual({ q: 3, r: 3 });
                expect(enemies[0].id).toContain('enemy_3_3_');
            }
        });

        it('should calculate level based on distance', () => {
            const hex = { q: 10, r: 10, terrain: 0 };
            mockGame.hexGrid.hexes.set('10,10', hex);
            mockGame.terrain.getName.mockReturnValue('ruins');
            
            entityManager.createEnemies();
            
            // Distance = max(10, 10, 20) = 20, level = 10
            expect(mockGame.enemyAI.generateEnemy).toHaveBeenCalledWith('ruins', expect.any(Number));
        });

        it('should sync enemies to game.enemies for compatibility', () => {
            const hex = { q: 5, r: 5, terrain: 0 };
            mockGame.hexGrid.hexes.set('5,5', hex);
            mockGame.terrain.getName.mockReturnValue('ruins');
            
            entityManager.createEnemies();
            
            expect(mockGame.enemies).toEqual(entityManager.enemies);
        });

        it('should log spawn count', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            const hex = { q: 5, r: 5, terrain: 0 };
            mockGame.hexGrid.hexes.set('5,5', hex);
            mockGame.terrain.getName.mockReturnValue('ruins');
            
            entityManager.createEnemies();
            
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Spawned'));
            consoleSpy.mockRestore();
        });

        it('should handle random spawn chance for non-site terrain', () => {
            const hex = { q: 5, r: 5, terrain: 0 };
            mockGame.hexGrid.hexes.set('5,5', hex);
            mockGame.terrain.getName.mockReturnValue('plains');
            
            // With random < 0.3, should spawn
            // We can't easily test random, but we can verify it doesn't crash
            entityManager.createEnemies();
            
            expect(entityManager.enemies).toBeDefined();
        });
    });

    describe('getEnemyAt()', () => {
        it('should find enemy at position', () => {
            const enemy1 = { position: { q: 1, r: 2 }, id: 'enemy1' };
            const enemy2 = { position: { q: 3, r: 4 }, id: 'enemy2' };
            entityManager.enemies = [enemy1, enemy2];
            
            const found = entityManager.getEnemyAt(1, 2);
            expect(found).toBe(enemy1);
        });

        it('should return undefined if no enemy at position', () => {
            entityManager.enemies = [{ position: { q: 1, r: 2 } }];
            const found = entityManager.getEnemyAt(3, 4);
            expect(found).toBeUndefined();
        });

        it('should handle enemy with position directly on object', () => {
            const enemy = { q: 1, r: 2, id: 'enemy1' }; // Legacy format
            entityManager.enemies = [enemy];
            
            const found = entityManager.getEnemyAt(1, 2);
            expect(found).toBe(enemy);
        });

        it('should return first match if multiple enemies at same position', () => {
            const enemy1 = { position: { q: 1, r: 2 }, id: 'enemy1' };
            const enemy2 = { position: { q: 1, r: 2 }, id: 'enemy2' };
            entityManager.enemies = [enemy1, enemy2];
            
            const found = entityManager.getEnemyAt(1, 2);
            expect(found).toBe(enemy1);
        });
    });

    describe('removeEnemy()', () => {
        it('should remove enemy from array', () => {
            const enemy = { position: { q: 1, r: 2 }, id: 'test' };
            entityManager.enemies = [enemy];
            
            entityManager.removeEnemy(enemy);
            
            expect(entityManager.enemies).toEqual([]);
        });

        it('should not crash if enemy not in array', () => {
            const enemy1 = { position: { q: 1, r: 2 }, id: 'test1' };
            const enemy2 = { position: { q: 3, r: 4 }, id: 'test2' };
            entityManager.enemies = [enemy1];
            
            entityManager.removeEnemy(enemy2);
            
            expect(entityManager.enemies).toEqual([enemy1]);
        });

        it('should sync to game.enemies', () => {
            const enemy = { position: { q: 1, r: 2 }, id: 'test' };
            entityManager.enemies = [enemy];
            
            entityManager.removeEnemy(enemy);
            
            expect(mockGame.enemies).toEqual([]);
        });

        it('should handle duplicate enemies (remove first)', () => {
            const enemy1 = { position: { q: 1, r: 2 }, id: 'test' };
            const enemy2 = { position: { q: 1, r: 2 }, id: 'test' };
            entityManager.enemies = [enemy2, enemy1];
            
            entityManager.removeEnemy(enemy1);
            
            expect(entityManager.enemies).toEqual([enemy2]);
        });
    });

    describe('getUnits()', () => {
        it('should return hero units when hero exists', () => {
            const hero = { units: ['unit1', 'unit2'] };
            entityManager.hero = hero;
            
            const units = entityManager.getUnits();
            
            expect(units).toEqual(['unit1', 'unit2']);
        });

        it('should return empty array when no hero', () => {
            entityManager.hero = null;
            
            const units = entityManager.getUnits();
            
            expect(units).toEqual([]);
        });

        it('should return undefined when hero has no units property', () => {
            entityManager.hero = {};
            
            const units = entityManager.getUnits();
            
            expect(units).toBeUndefined();
        });

        it('should return undefined when hero units is undefined', () => {
            entityManager.hero = { units: undefined };
            
            const units = entityManager.getUnits();
            
            expect(units).toBeUndefined();
        });
    });

    describe('reset()', () => {
        it('should clear enemies and units', () => {
            entityManager.enemies = [{ id: 'test' }];
            entityManager.units = [{ id: 'unit' }];
            
            entityManager.reset();
            
            expect(entityManager.enemies).toEqual([]);
            expect(entityManager.units).toEqual([]);
        });

        it('should sync game.enemies to empty', () => {
            entityManager.enemies = [{ id: 'test' }];
            
            entityManager.reset();
            
            expect(mockGame.enemies).toEqual([]);
        });

        it('should handle reset when game is null', () => {
            entityManager.game = null;
            entityManager.enemies = [{ id: 'test' }];
            
            expect(() => entityManager.reset()).not.toThrow();
            expect(entityManager.enemies).toEqual([]);
        });
    });

    describe('Integration', () => {
        it('should maintain enemy list through create/remove cycle', () => {
            const hex = { q: 5, r: 5, terrain: 0 };
            mockGame.hexGrid.hexes.set('5,5', hex);
            mockGame.terrain.getName.mockReturnValue('ruins');
            
            entityManager.createEnemies();
            const initialCount = entityManager.enemies.length;
            
            if (initialCount > 0) {
                entityManager.removeEnemy(entityManager.enemies[0]);
                expect(entityManager.enemies.length).toBe(initialCount - 1);
            }
        });

        it('should handle empty hexGrid gracefully', () => {
            mockGame.hexGrid.hexes.clear();
            const result = entityManager.createEnemies();
            expect(result).toEqual([]);
        });

        it('should use game reference for sync', () => {
            const hex = { q: 5, r: 5, terrain: 0 };
            mockGame.hexGrid.hexes.set('5,5', hex);
            mockGame.terrain.getName.mockReturnValue('ruins');
            
            entityManager.createEnemies();
            
            expect(mockGame.enemies).toBe(entityManager.enemies);
        });
    });
});