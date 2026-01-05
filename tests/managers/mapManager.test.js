import { describe, it, expect } from '../testRunner.js';
import { MapManager } from '../../js/mapManager.js';
import { HexGrid } from '../../js/hexgrid.js';
import { TERRAIN_TYPES } from '../../js/constants.js';
import { SITE_TYPES } from '../../js/sites.js';
import { createMockCanvas } from '../test-mocks.js';

/**
 * Helper function to create a HexGrid with mock canvas
 */
function createTestHexGrid() {
    const mockCanvas = createMockCanvas();
    return new HexGrid(mockCanvas);
}

describe('MapManager - Initialization', () => {
    it('should initialize with a deck of tiles', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        expect(mapManager.tilesDeck.length).toBeGreaterThan(0);
        expect(mapManager.hexGrid).toBe(hexGrid);
        expect(mapManager.revealedHexes).toBeDefined();
    });

    it('should initialize deck with correct tile structure', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Each tile should have 7 terrains (center + 6 neighbors)
        mapManager.tilesDeck.forEach(tile => {
            expect(tile.length).toBe(7);
            tile.forEach(terrain => {
                expect(Object.values(TERRAIN_TYPES)).toContain(terrain);
            });
        });
    });

    it('should start with empty revealed hexes set', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        expect(mapManager.revealedHexes.size).toBe(0);
    });
});

describe('MapManager - Exploration Detection', () => {
    it('should detect exploration possibility at edge', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Place a starting tile
        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS });

        // Edge should be explorable (has empty neighbors)
        const canExplore = mapManager.canExplore(0, 0);
        expect(canExplore).toBe(true);
    });

    it('should not detect exploration if fully surrounded', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Place center hex
        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS });

        // Place all neighbors
        const neighbors = hexGrid.getNeighbors(0, 0);
        neighbors.forEach(n => {
            hexGrid.setHex(n.q, n.r, { terrain: TERRAIN_TYPES.FOREST });
        });

        // Should not be explorable (no empty neighbors)
        const canExplore = mapManager.canExplore(0, 0);
        expect(canExplore).toBe(false);
    });

    it('should detect exploration with partially filled neighbors', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS });

        // Fill only some neighbors
        const neighbors = hexGrid.getNeighbors(0, 0);
        hexGrid.setHex(neighbors[0].q, neighbors[0].r, { terrain: TERRAIN_TYPES.FOREST });
        hexGrid.setHex(neighbors[1].q, neighbors[1].r, { terrain: TERRAIN_TYPES.HILLS });

        // Should still be explorable
        const canExplore = mapManager.canExplore(0, 0);
        expect(canExplore).toBe(true);
    });
});

describe('MapManager - Tile Placement', () => {
    it('should place a new tile when exploring', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Place starting tile
        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS });

        const initialTileCount = mapManager.tilesDeck.length;
        const result = mapManager.explore(0, 0);

        expect(result.success).toBe(true);
        expect(mapManager.tilesDeck.length).toBe(initialTileCount - 1);
        expect(result.center).toBeDefined();
        expect(result.message).toBe('Neues Gebiet entdeckt!');
    });

    it('should fail to explore when deck is empty', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Empty the deck
        mapManager.tilesDeck = [];

        const result = mapManager.explore(0, 0);
        expect(result.success).toBe(false);
        expect(result.message).toBe('Keine weiteren Gebiete zu erkunden.');
    });

    it('should fail to explore when no empty neighbors', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS });

        // Fill all neighbors
        const neighbors = hexGrid.getNeighbors(0, 0);
        neighbors.forEach(n => {
            hexGrid.setHex(n.q, n.r, { terrain: TERRAIN_TYPES.FOREST });
        });

        const result = mapManager.explore(0, 0);
        expect(result.success).toBe(false);
        expect(result.message).toBe('Kein Platz zum Erkunden.');
    });

    it('should place tile with all 7 hexes (center + neighbors)', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        const terrains = [
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.HILLS,
            TERRAIN_TYPES.DESERT,
            TERRAIN_TYPES.WASTELAND,
            TERRAIN_TYPES.MOUNTAINS,
            TERRAIN_TYPES.WATER
        ];

        mapManager.placeTile(0, 0, terrains);

        // Check center
        expect(hexGrid.hasHex(0, 0)).toBe(true);
        expect(hexGrid.getHex(0, 0).terrain).toBe(TERRAIN_TYPES.PLAINS);

        // Check all 6 neighbors were placed
        const neighbors = hexGrid.getNeighbors(0, 0);
        expect(neighbors.length).toBe(6);

        neighbors.forEach((n, i) => {
            expect(hexGrid.hasHex(n.q, n.r)).toBe(true);
            expect(hexGrid.getHex(n.q, n.r).terrain).toBe(terrains[i + 1]);
        });
    });

    it('should not overwrite existing hexes when placing tile', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Pre-place a hex
        hexGrid.setHex(1, 0, { terrain: TERRAIN_TYPES.MOUNTAINS, special: true });

        const terrains = new Array(7).fill(TERRAIN_TYPES.PLAINS);
        mapManager.placeTile(0, 0, terrains);

        // The pre-placed hex should remain unchanged
        const existingHex = hexGrid.getHex(1, 0);
        expect(existingHex.terrain).toBe(TERRAIN_TYPES.MOUNTAINS);
        expect(existingHex.special).toBe(true);
    });

    it('should expand outward from origin', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Place center
        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS });

        const result = mapManager.explore(0, 0);
        expect(result.success).toBe(true);

        // New tile center should be distance 1 from origin
        const distance = hexGrid.distance(0, 0, result.center.q, result.center.r);
        expect(distance).toBe(1);
    });
});

describe('MapManager - Site Generation', () => {
    it('should randomly add sites to placed hexes', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Place many tiles to ensure at least some sites spawn
        for (let i = 0; i < 10; i++) {
            const terrains = new Array(7).fill(TERRAIN_TYPES.PLAINS);
            mapManager.placeTile(i, i, terrains);
        }

        // Count hexes with sites
        let sitesFound = 0;
        hexGrid.hexes.forEach(hex => {
            if (hex.site) {
                sitesFound++;
            }
        });

        // With 70 hexes (10 tiles * 7 hexes) and 20% chance, 
        // we should have at least a few sites
        expect(sitesFound).toBeGreaterThan(0);
    });

    it('should generate appropriate sites for terrain types', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Test multiple times to check probabilities
        const sitesByTerrain = {};

        for (let i = 0; i < 50; i++) {
            const terrainTypes = Object.values(TERRAIN_TYPES);
            terrainTypes.forEach(terrain => {
                const site = mapManager.getRandomSiteForTerrain(terrain);
                if (site) {
                    if (!sitesByTerrain[terrain]) {
                        sitesByTerrain[terrain] = new Set();
                    }
                    sitesByTerrain[terrain].add(site);
                }
            });
        }

        // Plains should generate villages
        if (sitesByTerrain[TERRAIN_TYPES.PLAINS]) {
            expect(sitesByTerrain[TERRAIN_TYPES.PLAINS].has(SITE_TYPES.VILLAGE)).toBe(true);
        }

        // Wasteland should generate mage towers or dungeons
        if (sitesByTerrain[TERRAIN_TYPES.WASTELAND]) {
            const wastelandSites = sitesByTerrain[TERRAIN_TYPES.WASTELAND];
            const hasCorrectSites = wastelandSites.has(SITE_TYPES.MAGE_TOWER) ||
                wastelandSites.has(SITE_TYPES.DUNGEON);
            expect(hasCorrectSites).toBe(true);
        }
    });

    it('should not generate sites on water', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        const waterSite = mapManager.getRandomSiteForTerrain(TERRAIN_TYPES.WATER);
        expect(waterSite).toBe(null);
    });

    it('should generate mines or dungeons on mountains', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Force non-null return (statistically likely in loop or just check logic)
        // Since it returns randomly, we can't assert strict equality without mocking math.random
        // But we can check if it returns valid types OR null (if logic allows null, but logic says MINE or DUNGEON, no null)
        // mapManager.js: Math.random() < 0.7 ? MINE : DUNGEON. Always returns a site!

        const mountainSite = mapManager.getRandomSiteForTerrain(TERRAIN_TYPES.MOUNTAINS);
        expect([SITE_TYPES.MINE, SITE_TYPES.DUNGEON]).toContain(mountainSite);
    });
});

describe('MapManager - Reveal Map', () => {
    it('should reveal hexes in range', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Place some hexes as unrevealed
        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS, revealed: false });
        hexGrid.setHex(1, 0, { terrain: TERRAIN_TYPES.FOREST, revealed: false });
        hexGrid.setHex(-1, 0, { terrain: TERRAIN_TYPES.HILLS, revealed: false });

        const newReveals = mapManager.revealMap(0, 0, 1);

        expect(newReveals).toBeGreaterThan(0);
        expect(hexGrid.getHex(0, 0).revealed).toBe(true);
        expect(hexGrid.getHex(1, 0).revealed).toBe(true);
    });

    it('should respect range parameter', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Create a grid of unrevealed hexes
        for (let q = -3; q <= 3; q++) {
            for (let r = -3; r <= 3; r++) {
                if (Math.abs(q + r) <= 3) {
                    hexGrid.setHex(q, r, { terrain: TERRAIN_TYPES.PLAINS, revealed: false });
                }
            }
        }

        // Reveal with range 1
        mapManager.revealMap(0, 0, 1);

        // Distance 0 and 1 should be revealed
        expect(hexGrid.getHex(0, 0).revealed).toBe(true);
        expect(hexGrid.getHex(1, 0).revealed).toBe(true);

        // Distance 2 should NOT be revealed
        expect(hexGrid.getHex(2, 0).revealed).toBe(false);
    });

    it('should not double-count already revealed hexes', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS, revealed: false });
        hexGrid.setHex(1, 0, { terrain: TERRAIN_TYPES.FOREST, revealed: true });

        const newReveals = mapManager.revealMap(0, 0, 1);

        // Only the center should count as new reveal
        expect(newReveals).toBe(1);
    });

    it('should track revealed hexes in set', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS, revealed: false });
        hexGrid.setHex(1, 0, { terrain: TERRAIN_TYPES.FOREST, revealed: false });

        mapManager.revealMap(0, 0, 1);

        expect(mapManager.revealedHexes.has('0,0')).toBe(true);
        expect(mapManager.revealedHexes.has('1,0')).toBe(true);
    });

    it('should handle revealing with different range values', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Create larger grid
        for (let q = -4; q <= 4; q++) {
            for (let r = -4; r <= 4; r++) {
                if (Math.abs(q + r) <= 4) {
                    hexGrid.setHex(q, r, { terrain: TERRAIN_TYPES.PLAINS, revealed: false });
                }
            }
        }

        // Test range 0 (only center)
        const reveals0 = mapManager.revealMap(0, 0, 0);
        expect(reveals0).toBe(1);

        // Reset
        hexGrid.hexes.forEach(hex => hex.revealed = false);
        mapManager.revealedHexes.clear();

        // Test range 3
        const reveals3 = mapManager.revealMap(0, 0, 3);
        expect(reveals3).toBeGreaterThan(reveals0);
    });
});

describe('MapManager - Multiple Exploration', () => {
    it('should allow multiple explorations until deck is empty', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS });

        const initialDeckSize = mapManager.tilesDeck.length;
        let explorations = 0;

        // Explore until we can't anymore
        for (let i = 0; i < initialDeckSize + 5; i++) {
            // Find an explorable hex
            let explored = false;
            hexGrid.hexes.forEach(hex => {
                if (!explored && mapManager.canExplore(hex.q, hex.r)) {
                    const result = mapManager.explore(hex.q, hex.r);
                    if (result.success) {
                        explorations++;
                        explored = true;
                    }
                }
            });
            if (!explored) break;
        }

        expect(explorations).toBe(initialDeckSize);
        expect(mapManager.tilesDeck.length).toBe(0);
    });

    it('should maintain map consistency across multiple explorations', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS });

        // Explore a few times
        for (let i = 0; i < 3; i++) {
            hexGrid.hexes.forEach(hex => {
                if (mapManager.canExplore(hex.q, hex.r)) {
                    mapManager.explore(hex.q, hex.r);
                    return;
                }
            });
        }

        // Verify no hexes overlap and all have valid terrain
        hexGrid.hexes.forEach(hex => {
            expect(Object.values(TERRAIN_TYPES)).toContain(hex.terrain);
        });
    });
});

describe('MapManager - Edge Cases', () => {
    it('should handle empty terrain array gracefully', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        mapManager.placeTile(0, 0, []);

        // Center should get undefined terrain (or default behavior)
        const centerHex = hexGrid.getHex(0, 0);
        expect(centerHex).toBeDefined();
    });

    it('should handle partial terrain array', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        // Only provide 3 terrains instead of 7
        mapManager.placeTile(0, 0, [
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.HILLS
        ]);

        const neighbors = hexGrid.getNeighbors(0, 0);
        neighbors.forEach(n => {
            const hex = hexGrid.getHex(n.q, n.r);
            // Should use fallback terrain (PLAINS) for missing entries
            expect(Object.values(TERRAIN_TYPES)).toContain(hex.terrain);
        });
    });

    it('should initialize with non-zero deck after construction', () => {
        const hexGrid = createTestHexGrid();
        const mapManager = new MapManager(hexGrid);

        expect(mapManager.tilesDeck.length).toBeGreaterThanOrEqual(6);
    });
});
