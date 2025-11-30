import { describe, it, expect } from './testRunner.js';
import { MapManager } from '../js/mapManager.js';
import { HexGrid } from '../js/hexgrid.js';
import { TERRAIN_TYPES } from '../js/terrain.js';

describe('MapManager', () => {
    it('should initialize with a deck of tiles', () => {
        const mockContext = {
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            closePath: () => { },
            createRadialGradient: () => ({ addColorStop: () => { } }),
            fill: () => { },
            save: () => { },
            clip: () => { },
            stroke: () => { },
            restore: () => { },
            fillText: () => { },
            clearRect: () => { },
        };
        const mockCanvas = {
            getContext: () => mockContext,
            width: 800,
            height: 600
        };
        const hexGrid = new HexGrid(mockCanvas);
        const mapManager = new MapManager(hexGrid);

        expect(mapManager.tilesDeck.length).toBeGreaterThan(0);
    });

    it('should detect exploration possibility at edge', () => {
        const mockContext = {
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            closePath: () => { },
            createRadialGradient: () => ({ addColorStop: () => { } }),
            fill: () => { },
            save: () => { },
            clip: () => { },
            stroke: () => { },
            restore: () => { },
            fillText: () => { },
            clearRect: () => { },
        };
        const mockCanvas = {
            getContext: () => mockContext,
            width: 800,
            height: 600
        };
        const hexGrid = new HexGrid(mockCanvas);
        const mapManager = new MapManager(hexGrid);

        // Place a starting tile
        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS });

        // Edge should be explorable
        const canExplore = mapManager.canExplore(0, 0);
        expect(canExplore).toBe(true);
    });

    it('should place a new tile when exploring', () => {
        const mockContext = {
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            closePath: () => { },
            createRadialGradient: () => ({ addColorStop: () => { } }),
            fill: () => { },
            save: () => { },
            clip: () => { },
            stroke: () => { },
            restore: () => { },
            fillText: () => { },
            clearRect: () => { },
        };
        const mockCanvas = {
            getContext: () => mockContext,
            width: 800,
            height: 600
        };
        const hexGrid = new HexGrid(mockCanvas);
        const mapManager = new MapManager(hexGrid);

        // Place starting tile
        hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS });

        const initialTileCount = mapManager.tilesDeck.length;
        const result = mapManager.explore(0, 0);

        expect(result.success).toBe(true);
        expect(mapManager.tilesDeck.length).toBe(initialTileCount - 1);
    });

    it('should fail to explore when deck is empty', () => {
        const mockContext = {
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            closePath: () => { },
            createRadialGradient: () => ({ addColorStop: () => { } }),
            fill: () => { },
            save: () => { },
            clip: () => { },
            stroke: () => { },
            restore: () => { },
            fillText: () => { },
            clearRect: () => { },
        };
        const mockCanvas = {
            getContext: () => mockContext,
            width: 800,
            height: 600
        };
        const hexGrid = new HexGrid(mockCanvas);
        const mapManager = new MapManager(hexGrid);

        // Empty the deck
        mapManager.tilesDeck = [];

        const result = mapManager.explore(0, 0);
        expect(result.success).toBe(false);
    });
});
