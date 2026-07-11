import { describe, it, expect, beforeEach } from 'vitest';
import { HexGridLogic } from '../js/hexgrid/HexGridLogic.js';

describe('HexGridLogic', () => {
    let grid;

    beforeEach(() => {
        grid = new HexGridLogic(40);
    });

    describe('constructor / setTerrainSystem', () => {
        it('initializes hexes map and default size', () => {
            expect(grid.hexSize).toBe(40);
            expect(grid.hexes).toBeInstanceOf(Map);
            expect(grid.terrainSystem).toBeNull();
        });

        it('stores terrain system', () => {
            const ts = { getMovementCost: () => 3 };
            grid.setTerrainSystem(ts);
            expect(grid.terrainSystem).toBe(ts);
        });
    });

    describe('coordinate conversions', () => {
        it('round-trips axial<->pixel for integer coords', () => {
            const { x, y } = grid.axialToPixelOffset(2, -1);
            const back = grid.pixelOffsetToAxial(x, y);
            expect(back.q).toBe(2);
            expect(back.r).toBe(-1);
        });

        it('roundAxial snaps to nearest valid hex', () => {
            const c = grid.roundAxial(0.1, -0.05);
            expect(c.q + 0).toBe(0);
            expect(c.r + 0).toBe(0);
        });
    });

    describe('spatial queries', () => {
        it('getHexKey formats q,r', () => {
            expect(grid.getHexKey(3, -2)).toBe('3,-2');
        });

        it('getNeighbors returns 6 neighbors', () => {
            expect(grid.getNeighbors(0, 0)).toHaveLength(6);
        });

        it('distance is zero for same hex and positive otherwise', () => {
            expect(grid.distance(0, 0, 0, 0)).toBe(0);
            expect(grid.distance(0, 0, 2, 0)).toBe(2);
        });

        it('getHexesInRange returns hexes within range (inclusive of center)', () => {
            const inRange1 = grid.getHexesInRange(0, 0, 1);
            expect(inRange1.length).toBe(7); // 6 neighbors + center
            expect(inRange1.some(h => h.q === 0 && h.r === 0)).toBe(true);
            expect(grid.getHexesInRange(0, 0, 0)).toEqual([{ q: 0, r: 0 }]);
        });

        it('getRing returns only hexes at exactly the radius', () => {
            const ring0 = grid.getRing(0, 0, 0);
            expect(ring0).toEqual([{ q: 0, r: 0 }]);
            const ring2 = grid.getRing(0, 0, 2);
            expect(ring2.every(h => grid.distance(0, 0, h.q, h.r) === 2)).toBe(true);
            expect(ring2.length).toBe(12);
        });
    });

    describe('hex data management', () => {
        it('setHex then getHex retrieves data', () => {
            grid.setHex(1, 2, { terrain: 'plains' });
            const h = grid.getHex(1, 2);
            expect(h.terrain).toBe('plains');
            expect(h.q).toBe(1);
            expect(h.r).toBe(2);
        });

        it('setHex merges existing data', () => {
            grid.setHex(1, 2, { terrain: 'plains' });
            grid.setHex(1, 2, { revealed: true });
            const h = grid.getHex(1, 2);
            expect(h.terrain).toBe('plains');
            expect(h.revealed).toBe(true);
        });

        it('setHex with separate site arg attaches site', () => {
            grid.setHex(1, 2, { terrain: 'plains' }, { type: 'city' });
            expect(grid.getHex(1, 2).site.type).toBe('city');
        });

        it('hasHex reflects presence', () => {
            expect(grid.hasHex(5, 5)).toBe(false);
            grid.setHex(5, 5, {});
            expect(grid.hasHex(5, 5)).toBe(true);
        });
    });

    describe('getMovementCost', () => {
        it('returns 2 with flight regardless of terrain', () => {
            grid.setHex(0, 0, { terrain: 'mountains' });
            expect(grid.getMovementCost(0, 0, false, true)).toBe(2);
        });

        it('returns 999 for missing hex', () => {
            expect(grid.getMovementCost(99, 99)).toBe(999);
        });

        it('uses terrain system cost when available', () => {
            grid.setTerrainSystem({ getMovementCost: (t) => (t === 'forest' ? 42 : 1) });
            grid.setHex(0, 0, { terrain: 'forest' });
            expect(grid.getMovementCost(0, 0)).toBe(42);
        });

        it('uses city override to cost 2 via terrain system', () => {
            grid.setTerrainSystem({ getMovementCost: () => 1 });
            grid.setHex(0, 0, { terrain: 'mountains', site: { type: 'city' } });
            expect(grid.getMovementCost(0, 0)).toBe(2);
        });

        it('falls back to default costs by terrain', () => {
            grid.setHex(1, 1, { terrain: 'wasteland' });
            expect(grid.getMovementCost(1, 1)).toBe(3);
            grid.setHex(2, 2, { terrain: 'water' });
            expect(grid.getMovementCost(2, 2)).toBe(999);
        });

        it('applies night penalties for forest and desert', () => {
            grid.setHex(0, 0, { terrain: 'forest' });
            expect(grid.getMovementCost(0, 0, true)).toBe(5);
            grid.setHex(1, 0, { terrain: 'desert' });
            expect(grid.getMovementCost(1, 0, true)).toBe(3);
        });

        it('returns default cost 2 for unknown terrain at night', () => {
            grid.setHex(3, 3, { terrain: 'unknown_terrain' });
            expect(grid.getMovementCost(3, 3, true)).toBe(2);
        });
    });

    describe('getReachableHexes', () => {
        it('returns empty for null start', () => {
            expect(grid.getReachableHexes(null, 10, true)).toEqual([]);
        });

        it('finds reachable hexes within movement budget', () => {
            // Build a small connected field of plains (cost 2 each)
            for (let q = -2; q <= 2; q++) {
                for (let r = -2; r <= 2; r++) {
                    grid.setHex(q, r, { terrain: 'plains' });
                }
            }
            const reachable = grid.getReachableHexes({ q: 0, r: 0 }, 4, true); // 2 hexes of cost 2
            expect(reachable.length).toBeGreaterThan(0);
            // (3,0) is distance 3 -> total cost 6 > budget 4 -> not reachable
            expect(reachable.some(h => h.q === 3 && h.r === 0)).toBe(false);
        });

        it('excludes hexes beyond budget', () => {
            grid.setHex(0, 0, { terrain: 'plains' });
            grid.setHex(1, 0, { terrain: 'wasteland' }); // cost 3
            grid.setHex(2, 0, { terrain: 'plains' }); // would be cost 5 total
            const reachable = grid.getReachableHexes({ q: 0, r: 0 }, 3, true);
            expect(reachable.some(h => h.q === 2 && h.r === 0)).toBe(false);
        });
    });

    describe('findPath', () => {
        function buildField() {
            for (let q = -3; q <= 3; q++) {
                for (let r = -3; r <= 3; r++) {
                    grid.setHex(q, r, { terrain: 'plains' });
                }
            }
        }

        it('returns empty when start equals end', () => {
            buildField();
            expect(grid.findPath({ q: 0, r: 0 }, { q: 0, r: 0 })).toEqual([]);
        });

        it('finds a path between two connected hexes', () => {
            buildField();
            const path = grid.findPath({ q: 0, r: 0 }, { q: 2, r: 0 });
            expect(path.length).toBeGreaterThan(0);
            expect(path[path.length - 1]).toEqual({ q: 2, r: 0 });
        });

        it('returns empty when no path exists (water wall)', () => {
            buildField();
            for (let r = -3; r <= 3; r++) grid.setHex(0, r, { terrain: 'water' });
            // goal isolated by water (cost 999, skipped)
            const path = grid.findPath({ q: -1, r: 0 }, { q: 1, r: 0 });
            expect(path).toEqual([]);
        });

        it('uses flight to cross water', () => {
            buildField();
            for (let r = -3; r <= 3; r++) grid.setHex(0, r, { terrain: 'water' });
            const path = grid.findPath({ q: -1, r: 0 }, { q: 1, r: 0 }, true);
            expect(path.length).toBeGreaterThan(0);
        });
    });

    describe('getState / loadState', () => {
        it('serializes hexes', () => {
            grid.setHex(1, 1, { terrain: 'forest', revealed: true, enemies: [] });
            const state = grid.getState();
            expect(state.hexes['1,1'].terrain).toBe('forest');
            expect(state.hexes['1,1'].revealed).toBe(true);
        });

        it('returns early on null state', () => {
            expect(() => grid.loadState(null)).not.toThrow();
            expect(grid.hexes.size).toBe(0);
        });

        it('loads object-format hexes', () => {
            grid.loadState({ hexes: { '2,3': { terrain: 'plains' } }, hexSize: 50 });
            expect(grid.getHex(2, 3).terrain).toBe('plains');
            expect(grid.hexSize).toBe(50);
        });

        it('loads array-format hexes', () => {
            grid.loadState({ hexes: [['4,4', { terrain: 'hills' }]], hexSize: 60 });
            expect(grid.getHex(4, 4).terrain).toBe('hills');
        });
    });

    describe('exploreAdjacent', () => {
        it('reveals hidden neighbors', () => {
            grid.setHex(1, 0, {});
            grid.setHex(0, 1, {});
            grid.setHex(-1, 1, { revealed: true });
            const revealed = grid.exploreAdjacent({ q: 0, r: 0 });
            expect(revealed.length).toBeGreaterThan(0);
            expect(grid.getHex(1, 0).revealed).toBe(true);
        });

        it('does not re-reveal already revealed neighbors', () => {
            grid.setHex(1, 0, { revealed: true });
            const revealed = grid.exploreAdjacent({ q: 0, r: 0 });
            expect(revealed.some(h => h.q === 1 && h.r === 0)).toBe(false);
        });
    });
});
