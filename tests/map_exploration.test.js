import { TestRunner } from './testRunner.js';
import { MapManager } from '../js/mapManager.js';
import { HexGrid } from '../js/hexgrid.js';
import { TERRAIN_TYPES } from '../js/terrain.js';

const runner = new TestRunner();
const describe = runner.describe.bind(runner);
const it = runner.it.bind(runner);
const expect = runner.expect.bind(runner);
const beforeEach = runner.beforeEach.bind(runner);

// Mock Canvas
class MockCanvas {
    constructor() {
        this.width = 800;
        this.height = 600;
    }
    getContext() {
        return {
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
            clearRect: () => { }
        };
    }
}

describe('Map Exploration', () => {
    let mapManager;
    let hexGrid;

    beforeEach(() => {
        hexGrid = new HexGrid(new MockCanvas());
        mapManager = new MapManager(hexGrid);
    });

    it('should initialize with empty revealed set', () => {
        expect(mapManager.revealedHexes.size).toBe(0);
    });

    it('should place tiles as unrevealed by default', () => {
        mapManager.placeTile(0, 0, [TERRAIN_TYPES.PLAINS]);
        const hex = hexGrid.getHex(0, 0);
        expect(hex.revealed).toBe(false);
    });

    it('should reveal hexes within range', () => {
        mapManager.placeTile(0, 0, [TERRAIN_TYPES.PLAINS]);

        const revealedCount = mapManager.revealMap(0, 0, 1);
        const hex = hexGrid.getHex(0, 0);

        expect(hex.revealed).toBe(true);
        expect(revealedCount).toBeGreaterThan(0);
        expect(mapManager.revealedHexes.has('0,0')).toBe(true);
    });

    it('should explore new areas', () => {
        // Place initial tile
        mapManager.placeTile(0, 0, [TERRAIN_TYPES.PLAINS]);

        // Try to explore from center
        const result = mapManager.explore(0, 0);

        expect(result.success).toBe(true);
        expect(result.center).toBeDefined();

        // Check if new hexes were added
        const newCenter = hexGrid.getHex(result.center.q, result.center.r);
        expect(newCenter).toBeDefined();
    });
});
