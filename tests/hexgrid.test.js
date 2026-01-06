import { describe, it, expect, beforeEach } from 'vitest';
import { HexGrid } from '../js/hexgrid.js';

// Mock Canvas
import { createMockContext } from './test-mocks.js';

// Mock Canvas
const mockContext = createMockContext();

const mockCanvas = {
    getContext: () => mockContext,
    width: 800,
    height: 600
};

describe('HexGrid System', () => {
    let grid;

    beforeEach(() => {
        grid = new HexGrid(mockCanvas);
    });

    it('should initialize correctly', () => {
        expect(grid.hexSize).toBe(40);
        expect(grid.hexes).toBeDefined();
    });

    it('should convert axial to pixel coordinates', () => {
        // Center (0,0) should be at canvas center (400, 300)
        const center = grid.axialToPixel(0, 0);
        expect(center.x).toBe(400);
        expect(center.y).toBe(300);

        // Neighbor (1, 0)
        // x = size * 3/2 * q = 40 * 1.5 * 1 = 60
        // y = size * sqrt(3)/2 * q + sqrt(3) * r = 40 * 0.866 * 1 + 0 = 34.64
        const neighbor = grid.axialToPixel(1, 0);
        expect(neighbor.x).toBe(460);
        // y should be close to 300 + 34.64
        expect(Math.abs(neighbor.y - 334.64) < 1).toBe(true);
    });

    it('should convert pixel to axial coordinates', () => {
        // Center pixel
        const centerAxial = grid.pixelToAxial(400, 300);
        expect(centerAxial.q).toBe(0);
        expect(centerAxial.r).toBe(0);

        // Pixel roughly at (1, 0)
        // x = 460, y = 335
        const neighborAxial = grid.pixelToAxial(460, 335);
        expect(neighborAxial.q).toBe(1);
        expect(neighborAxial.r).toBe(0);
    });

    it('should round axial coordinates correctly', () => {
        // Exact
        let rounded = grid.roundAxial(1.0, 0.0);
        expect(rounded.q).toBe(1);
        expect(rounded.r).toBe(0);

        // Close to (1, 0)
        rounded = grid.roundAxial(1.1, -0.1);
        expect(rounded.q).toBe(1);
        expect(rounded.r).toBeCloseTo(0);
    });

    it('should calculate neighbors', () => {
        const neighbors = grid.getNeighbors(0, 0);
        expect(neighbors).toHaveLength(6);

        // Check specific neighbor (1, 0)
        const hasRight = neighbors.some(n => n.q === 1 && n.r === 0);
        expect(hasRight).toBe(true);

        // Check specific neighbor (0, -1)
        const hasTopLeft = neighbors.some(n => n.q === 0 && n.r === -1);
        expect(hasTopLeft).toBe(true);
    });

    it('should calculate distance', () => {
        expect(grid.distance(0, 0, 0, 0)).toBe(0);
        expect(grid.distance(0, 0, 1, 0)).toBe(1);
        expect(grid.distance(0, 0, 2, 0)).toBe(2);
        expect(grid.distance(0, 0, 1, 1)).toBe(2); // (1,1) is 2 steps away: (0,0)->(1,0)->(1,1) or (0,0)->(0,1)->(1,1)? No, (1,1) is diagonal?
        // Let's trace: (0,0) -> (0,1) -> (1,1) is 2 steps.
        // Formula: (|q1-q2| + |q1+r1-q2-r2| + |r1-r2|) / 2
        // (0,0) to (1,1): (|0-1| + |0-2| + |0-1|) / 2 = (1 + 2 + 1) / 2 = 2. Correct.
    });

    it('should get hexes in range', () => {
        const range1 = grid.getHexesInRange(0, 0, 1);
        // Center + 6 neighbors = 7
        expect(range1).toHaveLength(7);

        const range0 = grid.getHexesInRange(0, 0, 0);
        expect(range0).toHaveLength(1);
    });

    it('should set and get hex data', () => {
        grid.setHex(2, -1, { terrain: 'forest' });

        expect(grid.hasHex(2, -1)).toBe(true);
        expect(grid.hasHex(5, 5)).toBe(false);

        const data = grid.getHex(2, -1);
        expect(data.terrain).toBe('forest');
    });
});
