import { describe, it, expect, beforeEach } from 'vitest';
import { HexGridLogic } from '../../js/hexgrid/HexGridLogic';

describe('HexGridLogic Pathfinding', () => {
    let logic;

    beforeEach(() => {
        logic = new HexGridLogic(40);
        // Add some hexes
        for (let q = -5; q <= 5; q++) {
            for (let r = -5; r <= 5; r++) {
                logic.setHex(q, r, { terrain: 'plains' });
            }
        }
    });

    it('should find direct path on plains', () => {
        const start = { q: 0, r: 0 };
        const end = { q: 2, r: 0 };
        const path = logic.findPath(start, end);

        // Expected path: [ {q:0, r:0}, {q:1, r:0}, {q:2, r:0} ]
        expect(path).toHaveLength(3);
        expect(path[0]).toEqual(start);
        expect(path[2]).toEqual(end);
    });

    it('should avoid high-cost terrain if possible', () => {
        const start = { q: 0, r: 0 };
        const end = { q: 2, r: 0 };

        // Blocking the direct path (1,0) with a mountain (cost 5)
        logic.setHex(1, 0, { terrain: 'mountains' });

        const path = logic.findPath(start, end);

        // Path should go around (1, 0) because (1,0) cost is 5, but going (0,1) -> (1,1) -> (2,0) costs 2+2=4? 
        // Wait, (0,0)->(1,-1) costs 2, (1,-1)->(2,0) costs 2. Total cost 4.
        // Direct through mountain costs 5.
        // So it SHOULD avoid it.
        expect(path).toBeDefined();
        const hasMountain = path.some(h => h.q === 1 && h.r === 0);
        expect(hasMountain).toBe(false);
    });

    it('should handle flight (lower costs)', () => {
        const start = { q: 0, r: 0 };
        const end = { q: 2, r: 0 };

        // Wall of mountains
        logic.setHex(1, -1, { terrain: 'mountains' });
        logic.setHex(1, 0, { terrain: 'mountains' });
        logic.setHex(1, 1, { terrain: 'mountains' });

        const pathFlight = logic.findPath(start, end, true);
        // With flight, movement is always 2. Direct distance is 2 steps.
        expect(pathFlight.length).toBe(3);
    });
});
