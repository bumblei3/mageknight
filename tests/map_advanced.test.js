
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MapManager } from '../js/mapManager.js';
import { HexGrid } from '../js/hexgrid.js';
import { TERRAIN_TYPES } from '../js/constants.js';
import { setupGlobalMocks, resetMocks, MockHTMLElement } from './test-mocks.js';

// Setup global mocks
setupGlobalMocks();

describe('Advanced Map Logic', () => {
    let mapManager;
    let hexGrid;
    let canvas;

    beforeEach(() => {
        resetMocks();

        // Mock Canvas (needed for HexGrid)
        canvas = new MockHTMLElement('canvas');
        canvas.getContext = () => ({
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            closePath: () => { },
            fill: () => { },
            stroke: () => { },
            createRadialGradient: () => ({ addColorStop: () => { } }),
            save: () => { },
            restore: () => { },
            clip: () => { },
            fillText: () => { },
            measureText: () => ({ width: 10 }),
            clearRect: () => { },
            translate: () => { },
            scale: () => { }
        });

        hexGrid = new HexGrid(canvas);
        mapManager = new MapManager(hexGrid);
    });

    afterEach(() => {
        resetMocks();
    });

    it('should place tile neighbors correctly', () => {
        // Place initial tile at 0,0
        mapManager.placeTile(0, 0, [TERRAIN_TYPES.PLAINS]);

        // Check center
        const center = hexGrid.getHex(0, 0);
        expect(center.terrain).toBe(TERRAIN_TYPES.PLAINS);

        // Check neighbor placement
        // placeTile places center + 6 neighbors. 
        const neighbors = hexGrid.getNeighbors(0, 0);

        // We provided only 1 terrain to placeTile, so it defaults rest to PLAINS
        neighbors.forEach(n => {
            expect(hexGrid.hasHex(n.q, n.r)).toBe(true);
        });
    });

    it('should respect deck limitations during exploration', () => {
        // Mock deck with 1 tile
        mapManager.tilesDeck = [[TERRAIN_TYPES.DESERT]];

        // Place start
        mapManager.placeTile(0, 0, [TERRAIN_TYPES.PLAINS]);

        // Find an edge hex (neighbor of 0,0)
        const neighbors = hexGrid.getNeighbors(0, 0);
        const edgeHex = neighbors[0];

        // Explore 1
        const result1 = mapManager.explore(edgeHex.q, edgeHex.r);
        expect(result1.success).toBe(true);

        // Explore 2 (Empty deck)
        const result2 = mapManager.explore(0, 0);
        expect(result2.success).toBe(false);
        expect(result2.message).toContain('Keine weiteren Gebiete');
    });

    it('should correctly store and retrieve terrain info', () => {
        mapManager.placeTile(0, 0, [TERRAIN_TYPES.FOREST]);
        const hex = hexGrid.getHex(0, 0);
        expect(hex.terrain).toBe(TERRAIN_TYPES.FOREST);
    });

    it('should manage site locations correctly', () => {
        // Place a tile with a site manually (simulating random drop)
        mapManager.placeTile(0, 0, [TERRAIN_TYPES.PLAINS]);
        const hex = hexGrid.getHex(0, 0);

        const site = { type: 'VILLAGE', id: 'v1' };
        hex.site = site;

        // MapManager doesn't store sites in a separate list in this version, 
        // it relies on hex data.

        const retrievedHex = hexGrid.getHex(0, 0);
        expect(retrievedHex.site).toBe(site);
    });

    it('canExplore should return true only if unrevealed neighbors exist', () => {
        // This test depends on grid state.
        // Initially empty grid? 
        // placeTile fills center + neighbors.
        mapManager.placeTile(0, 0, [TERRAIN_TYPES.PLAINS]); // Fills neighbors.

        // Neighbors of 0,0 are all filled.
        expect(mapManager.canExplore(0, 0)).toBe(false); // All neighbors exist

        // A neighbor's neighbor might be missing though.
        const neighbor = hexGrid.getNeighbors(0, 0)[0];
        // Neighbors of first neighbor:
        // Some are shared with 0,0 (exist), some are outward (missing).
        expect(mapManager.canExplore(neighbor.q, neighbor.r)).toBe(true);
    });
});
