import * as HexUtils from '../utils/hexUtils.js';

export class HexGridLogic {
    constructor(hexSize = 40) {
        this.hexSize = hexSize;
        this.hexes = new Map();
        this.terrainSystem = null;
    }

    setTerrainSystem(terrainSystem) {
        this.terrainSystem = terrainSystem;
    }

    // ========== Coordinate Conversions ==========

    /**
     * Converts axial (q, r) to pixel (x, y) offset from center.
     */
    axialToPixelOffset(q, r) {
        const x = this.hexSize * (3 / 2 * q);
        const y = this.hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
        return { x, y };
    }

    /**
     * Converts pixel offset to axial coordinates.
     */
    pixelOffsetToAxial(x, y) {
        const q = (2 / 3 * x) / this.hexSize;
        const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / this.hexSize;
        return this.roundAxial(q, r);
    }

    /**
     * Rounds floating point axial coordinates to the nearest valid hex.
     */
    roundAxial(q, r) {
        return HexUtils.roundAxial(q, r);
    }

    // ========== Spatial Queries ==========

    getHexKey(q, r) {
        return HexUtils.getHexKey(q, r);
    }

    getNeighbors(q, r) {
        return HexUtils.getNeighbors(q, r);
    }

    distance(q1, r1, q2, r2) {
        return HexUtils.distance(q1, r1, q2, r2);
    }

    getHexesInRange(q, r, range) {
        return HexUtils.getHexesInRange(q, r, range);
    }

    // ========== Hex Data Management ==========

    setHex(q, r, data) {
        const key = this.getHexKey(q, r);
        const existing = this.hexes.get(key) || {};
        this.hexes.set(key, { ...existing, ...data, q, r });
    }

    getHex(q, r) {
        return this.hexes.get(this.getHexKey(q, r)) || null;
    }

    hasHex(q, r) {
        return this.hexes.has(this.getHexKey(q, r));
    }

    // ========== Pathfinding ==========

    getMovementCost(q, r, isNight = false, hasFlight = false) {
        if (hasFlight) return 1;

        const hex = this.getHex(q, r);
        if (!hex) return 999;

        if (this.terrainSystem) {
            return this.terrainSystem.getMovementCost(hex.terrain, isNight);
        }

        const costs = { plains: 2, forest: 3, hills: 3, mountains: 5, desert: 5, wasteland: 3, water: 999 };
        const cost = costs[hex.terrain] || 2;

        if (isNight) {
            if (hex.terrain === 'forest') return 5;
            if (hex.terrain === 'desert') return 3;
        }

        return cost;
    }

    getReachableHexes(startPos, movementPoints, isDay, hasFlight = false) {
        if (!startPos) return [];

        const reachable = [];
        const queue = [{ q: startPos.q, r: startPos.r, cost: 0 }];
        const visited = new Map();
        visited.set(this.getHexKey(startPos.q, startPos.r), 0);

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.q !== startPos.q || current.r !== startPos.r) {
                reachable.push({ q: current.q, r: current.r });
            }

            for (const neighbor of this.getNeighbors(current.q, current.r)) {
                if (!this.hasHex(neighbor.q, neighbor.r)) continue;

                const moveCost = this.getMovementCost(neighbor.q, neighbor.r, !isDay, hasFlight);
                const totalCost = current.cost + moveCost;

                if (totalCost <= movementPoints) {
                    const key = this.getHexKey(neighbor.q, neighbor.r);
                    if (!visited.has(key) || visited.get(key) > totalCost) {
                        visited.set(key, totalCost);
                        queue.push({ ...neighbor, cost: totalCost });
                    }
                }
            }
        }

        return reachable;
    }

    // ========== State Persistence ==========

    getState() {
        return {
            hexes: Array.from(this.hexes.entries())
        };
    }

    loadState(state) {
        if (!state) return;
        if (state.hexes) {
            this.hexes = new Map(state.hexes);
        }
    }
}
