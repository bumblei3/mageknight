import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MapManager } from '../js/mapManager.js';
import { TERRAIN_TYPES } from '../js/constants.js';
import { SITE_TYPES } from '../js/sites.js';
import { Site } from '../js/sites.js';

describe('MapManager - Coverage Boost', () => {
    let mapManager;
    let mockGame;
    let mockHexGrid;
    let mockWorldEventManager;

    beforeEach(() => {
        mockHexGrid = {
            setHex: vi.fn(),
            getHex: vi.fn(() => ({ terrain: 'plains', revealed: false, site: null })),
            getNeighbors: vi.fn(() => []),
            getRing: vi.fn(() => []),
            getHexesInRange: vi.fn(() => []),
            hasHex: vi.fn(() => true),
            distance: vi.fn(() => 1)
        };

        mockWorldEventManager = {
            onTileRevealed: vi.fn(),
            getRandomEvent: vi.fn().mockReturnValue({ type: 'test', text: 'Test event', options: [] })
        };

        mockGame = {
            hexGrid: mockHexGrid,
            scenarioManager: {
                currentScenario: { mapConfig: { sitePlacements: [] } }
            }
        };

        mapManager = new MapManager(mockGame);
        mapManager.setWorldEventManager(mockWorldEventManager);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with game and tilesDeck populated', () => {
            expect(mapManager).toBeDefined();
            expect(mapManager.tilesDeck).toBeDefined();
            expect(mapManager.tilesDeck.length).toBe(10);
        });

        it('should initialize tilesDeck with 10 tiles', () => {
            expect(mapManager.tilesDeck.length).toBe(10);
            mapManager.tilesDeck.forEach(tile => {
                expect(tile.terrains.length).toBe(7);
                expect(tile).toHaveProperty('siteType');
                expect(Array.isArray(tile.enemyTypes)).toBe(true);
            });
        });

        it('should set worldEventManager', () => {
            const newManager = { onTileRevealed: vi.fn() };
            mapManager.setWorldEventManager(newManager);
        });
    });

    describe('getRandomTerrain', () => {
        it('should return PLAINS for low random', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const terrain = mapManager.getRandomTerrain();
            expect(terrain).toBe(TERRAIN_TYPES.PLAINS);
            spy.mockRestore();
        });

        it('should return FOREST for medium random', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
            const terrain = mapManager.getRandomTerrain();
            expect(terrain).toBe(TERRAIN_TYPES.FOREST);
            spy.mockRestore();
        });

        it('should return HILLS for higher random', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.7);
            const terrain = mapManager.getRandomTerrain();
            expect(terrain).toBe(TERRAIN_TYPES.HILLS);
            spy.mockRestore();
        });

        it('should return MOUNTAINS for very high random', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.85);
            const terrain = mapManager.getRandomTerrain();
            expect(terrain).toBe(TERRAIN_TYPES.MOUNTAINS);
            spy.mockRestore();
        });

        it('should return WASTELAND for highest random', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.95);
            const terrain = mapManager.getRandomTerrain();
            expect(terrain).toBe(TERRAIN_TYPES.WASTELAND);
            spy.mockRestore();
        });
    });

    describe('createStartingMap', () => {
        it('should generate default map when no scenario data', () => {
            mockHexGrid.getRing.mockReturnValue([{ q: 1, r: 0 }]);
            
            mapManager.createStartingMap(null);
            expect(mockHexGrid.setHex).toHaveBeenCalled();
        });

        it('should create map from start tile when provided', () => {
            const scenarioData = { 
                mapConfig: { 
                    startTile: [TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.SWAMP] 
                } 
            };
            mockHexGrid.getNeighbors.mockReturnValue([
                { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
                { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }
            ]);
            
            mapManager.createStartingMap(scenarioData);
            
            expect(mockHexGrid.setHex).toHaveBeenCalledWith(0, 0, { terrain: TERRAIN_TYPES.PLAINS });
            expect(mockHexGrid.setHex).toHaveBeenCalledTimes(7); // center + 6 neighbors
        });

        it('should load map from hex data when provided', () => {
            const scenarioData = { 
                hexes: [
                    { q: 0, r: 0, terrain: TERRAIN_TYPES.PLAINS },
                    { q: 1, r: 0, terrain: TERRAIN_TYPES.FOREST }
                ]
            };
            
            mapManager.createStartingMap(scenarioData);
            
            expect(mockHexGrid.setHex).toHaveBeenCalledTimes(2);
            expect(mockHexGrid.setHex).toHaveBeenCalledWith(0, 0, { terrain: TERRAIN_TYPES.PLAINS }, undefined);
            expect(mockHexGrid.setHex).toHaveBeenCalledWith(1, 0, { terrain: TERRAIN_TYPES.FOREST }, undefined);
        });

        it('keeps scenario goal sites off the start map', () => {
            const scenarioData = {
                mapConfig: {
                    sitePlacements: [
                        { type: SITE_TYPES.MINE, q: 2, r: 2, count: 2, radius: 2 }
                    ]
                }
            };
            const placeGoals = vi.spyOn(mapManager, 'placeScenarioSites');
            mockHexGrid.hasHex.mockReturnValue(true);
            mockHexGrid.getHex.mockReturnValue({ site: null, terrain: TERRAIN_TYPES.PLAINS });
            mockHexGrid.getNeighbors.mockReturnValue([]);
            mockHexGrid.getRing.mockReturnValue([]);
            mockHexGrid.getHexesInRange.mockReturnValue([]);

            mapManager.createStartingMap(scenarioData);

            expect(placeGoals).not.toHaveBeenCalled();
        });
    });

    describe('createMapFromStartTile', () => {
        it('should set center and neighbors', () => {
            const startTile = [TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST];
            mockHexGrid.getNeighbors.mockReturnValue([{ q: 1, r: 0 }]);
            
            // Access private method via bracket notation
            mapManager['createMapFromStartTile'](startTile);
            
            expect(mockHexGrid.setHex).toHaveBeenCalledWith(0, 0, { terrain: TERRAIN_TYPES.PLAINS });
            expect(mockHexGrid.setHex).toHaveBeenCalledWith(1, 0, { terrain: TERRAIN_TYPES.FOREST });
        });

        it('should use default PLAINS for missing neighbors', () => {
            const startTile = [TERRAIN_TYPES.PLAINS];
            mockHexGrid.getNeighbors.mockReturnValue([{ q: 1, r: 0 }]);
            
            mapManager['createMapFromStartTile'](startTile);
            
            expect(mockHexGrid.setHex).toHaveBeenCalledWith(1, 0, { terrain: TERRAIN_TYPES.PLAINS });
        });
    });

    describe('generateDefaultMap', () => {
        it('should set center and rings', () => {
            mockHexGrid.getRing.mockReturnValue([{ q: 1, r: 0 }]);
            
            mapManager['generateDefaultMap']();
            
            expect(mockHexGrid.setHex).toHaveBeenCalledWith(0, 0, { terrain: TERRAIN_TYPES.PLAINS });
            expect(mockHexGrid.getRing).toHaveBeenCalledWith(0, 0, 1);
            expect(mockHexGrid.getRing).toHaveBeenCalledWith(0, 0, 2);
            expect(mockHexGrid.getRing).toHaveBeenCalledWith(0, 0, 3);
        });
    });

    describe('loadMapFromData', () => {
        it('should load hexes from data', () => {
            const data = {
                hexes: [
                    { q: 0, r: 0, terrain: TERRAIN_TYPES.PLAINS, site: null },
                    { q: 1, r: 0, terrain: TERRAIN_TYPES.FOREST, site: new Site(SITE_TYPES.VILLAGE) }
                ]
            };
            
            mapManager['loadMapFromData'](data);
            
            expect(mockHexGrid.setHex).toHaveBeenCalledTimes(2);
        });

        it('should handle empty data', () => {
            mapManager['loadMapFromData']({ hexes: [] });
            expect(mockHexGrid.setHex).not.toHaveBeenCalled();
        });
    });

    describe('revealStartingArea', () => {
        it('should reveal center and neighbors', () => {
            mockHexGrid.getHex.mockReturnValue({ revealed: false });
            mockHexGrid.getNeighbors.mockReturnValue([{ q: 1, r: 0 }, { q: 0, r: 1 }]);
            
            mapManager['revealStartingArea']();
            
            expect(mockHexGrid.getHex).toHaveBeenCalledWith(0, 0);
            expect(mockHexGrid.getNeighbors).toHaveBeenCalledWith(0, 0);
            expect(mockHexGrid.getHex).toHaveBeenCalledWith(1, 0);
            expect(mockHexGrid.getHex).toHaveBeenCalledWith(0, 1);
        });

        it('should handle missing center hex', () => {
            mockHexGrid.getHex.mockReturnValue(null);
            mockHexGrid.getNeighbors.mockReturnValue([]);
            
            expect(() => mapManager['revealStartingArea']()).not.toThrow();
        });
    });

    describe('addMapTile', () => {
        it('should lay a drawn tile onto empty hexes', () => {
            mockHexGrid.getNeighbors.mockImplementation((q, r) => ([
                { q: q + 1, r }, { q: q + 1, r: r - 1 }, { q, r: r - 1 },
                { q: q - 1, r }, { q: q - 1, r: r + 1 }, { q, r: r + 1 }
            ]));
            mockHexGrid.hasHex.mockReturnValue(false);
            mapManager.tilesDeck = [{
                terrains: Array(7).fill(TERRAIN_TYPES.FOREST),
                siteType: null,
                enemyTypes: []
            }];

            const result = mapManager.addMapTile(0, 0, 'countryside');

            expect(result.success).toBe(true);
            expect(mockHexGrid.setHex).toHaveBeenCalledTimes(7);
            expect(mockHexGrid.setHex).toHaveBeenCalledWith(0, 0, expect.objectContaining({
                terrain: TERRAIN_TYPES.FOREST,
                revealed: true
            }));
        });

        it('should not overwrite existing hexes', () => {
            mockHexGrid.getNeighbors.mockReturnValue([
                { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
                { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
            ]);
            mockHexGrid.hasHex.mockReturnValue(true);
            const before = mapManager.tilesDeck.length;

            const result = mapManager.addMapTile(0, 0, 'core');

            expect(result.success).toBe(false);
            expect(mockHexGrid.setHex).not.toHaveBeenCalled();
            expect(mapManager.tilesDeck.length).toBe(before);
        });
    });

    describe('canExplore', () => {
        it('should return true when unknown neighbors exist', () => {
            mockHexGrid.getNeighbors.mockReturnValue([
                { q: 1, r: 0 }, { q: 0, r: 1 }
            ]);
            mockHexGrid.hasHex
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false);
            
            const result = mapManager.canExplore(0, 0);
            
            expect(result).toBe(true);
        });

        it('should return false when all neighbors known', () => {
            mockHexGrid.getNeighbors.mockReturnValue([
                { q: 1, r: 0 }, { q: 0, r: 1 }
            ]);
            mockHexGrid.hasHex.mockReturnValue(true);
            
            const result = mapManager.canExplore(0, 0);
            
            expect(result).toBe(false);
        });

        it('should return false when no neighbors', () => {
            mockHexGrid.getNeighbors.mockReturnValue([]);
            
            const result = mapManager.canExplore(0, 0);
            
            expect(result).toBe(false);
        });
    });

    describe('explore', () => {
        it('should return false when cannot explore', () => {
            mapManager.canExplore = vi.fn().mockReturnValue(false);

            const result = mapManager.explore(0, 0);

            expect(result.success).toBe(false);
        });

        it('should return false when the deck is empty', () => {
            mapManager.tilesDeck = [];
            mockHexGrid.getNeighbors.mockReturnValue([{ q: 1, r: 0 }]);
            mockHexGrid.hasHex.mockReturnValue(false);

            expect(mapManager.canExplore(0, 0)).toBe(false);
            expect(mapManager.explore(0, 0).success).toBe(false);
        });
    });

    describe('placeScenarioSites', () => {
        it('should place single site at primary position', () => {
            const placements = [
                { type: SITE_TYPES.VILLAGE, q: 2, r: 2, count: 1, radius: 2 }
            ];
            
            mockHexGrid.hasHex.mockReturnValue(true);
            mockHexGrid.getHex.mockReturnValue({ site: null });
            
            mapManager.placeScenarioSites(placements);
            
            const hex = mockHexGrid.getHex.mock.results[0].value;
            expect(hex.site).toBeInstanceOf(Site);
            expect(hex.site.type).toBe(SITE_TYPES.VILLAGE);
        });

        it('should distribute multiple sites around center using ring', () => {
            const placements = [
                { type: SITE_TYPES.KEEP, q: 3, r: 3, count: 3, radius: 1 }
            ];
            
            mockHexGrid.getRing.mockReturnValue([
                { q: 3, r: 2 }, { q: 4, r: 2 }, { q: 4, r: 3 }
            ]);
            mockHexGrid.hasHex.mockReturnValue(true);
            mockHexGrid.getHex.mockReturnValue({ site: null });
            
            mapManager.placeScenarioSites(placements);
            
            // Should attempt to place all 3
            expect(mockHexGrid.getRing).toHaveBeenCalledWith(3, 3, 1);
        });

        it('should fallback to empty hexes in range when ring full', () => {
            const placements = [
                { type: SITE_TYPES.MINE, q: 5, r: 5, count: 2, radius: 2 }
            ];
            
            mockHexGrid.getRing.mockReturnValue([]); // Ring empty
            mockHexGrid.getHexesInRange.mockReturnValue([
                { q: 5, r: 4 }, { q: 6, r: 4 }
            ]);
            mockHexGrid.hasHex.mockReturnValue(true);
            mockHexGrid.getHex.mockReturnValue({ site: null });
            
            mapManager.placeScenarioSites(placements);
            
            expect(mockHexGrid.getHexesInRange).toHaveBeenCalledWith(5, 5, 2);
        });

        it('should try adjacent hexes when primary occupied', () => {
            const placements = [
                { type: SITE_TYPES.DUNGEON, q: 1, r: 1, count: 1, radius: 1 }
            ];
            
            mockHexGrid.hasHex.mockReturnValue(true);
            mockHexGrid.getHex
                .mockReturnValueOnce({ site: {} }) // Primary occupied
                .mockReturnValueOnce({ site: null }); // Adjacent empty
            mockHexGrid.getNeighbors.mockReturnValue([{ q: 2, r: 1 }]);
            
            mapManager.placeScenarioSites(placements);
            
            expect(mockHexGrid.getNeighbors).toHaveBeenCalledWith(1, 1);
        });

        it('should stop after max attempts', () => {
            const placements = [
                { type: SITE_TYPES.TOMB, q: 0, r: 0, count: 1, radius: 1 }
            ];
            
            mockHexGrid.hasHex.mockReturnValue(true);
            mockHexGrid.getHex.mockReturnValue({ site: {} }); // Always occupied
            mockHexGrid.getNeighbors.mockReturnValue([{ q: 1, r: 0 }, { q: 0, r: 1 }].filter(() => false)); // No empty neighbors eventually
            
            // This would loop 10 times - we just verify it doesn't hang
            mapManager.placeScenarioSites(placements);
        });
    });
});