import * as HexUtils from '../utils/hexUtils';
import { Terrain } from '../terrain';

export interface HexData {
    q: number;
    r: number;
    terrain?: string; // or TerrainType
    site?: any;
    revealed?: boolean;
    cost?: number; // for pathfinding
}

export class HexGridLogic {
    public hexSize: number;
    public hexes: Map<string, HexData>;
    public terrainSystem: Terrain | null;

    constructor(hexSize: number = 40) {
        this.hexSize = hexSize;
        this.hexes = new Map();
        this.terrainSystem = null;
    }

    setTerrainSystem(terrainSystem: Terrain): void {
        this.terrainSystem = terrainSystem;
    }

    // ========== Coordinate Conversions ==========

    /**
     * Converts axial (q, r) to pixel (x, y) offset from center.
     */
    axialToPixelOffset(q: number, r: number): { x: number; y: number } {
        const x = this.hexSize * (3 / 2 * q);
        const y = this.hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
        return { x, y };
    }

    /**
     * Converts pixel offset to axial coordinates.
     */
    pixelOffsetToAxial(x: number, y: number): HexUtils.HexCoord {
        const q = (2 / 3 * x) / this.hexSize;
        const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / this.hexSize;
        return this.roundAxial(q, r);
    }

    /**
     * Rounds floating point axial coordinates to the nearest valid hex.
     */
    roundAxial(q: number, r: number): HexUtils.HexCoord {
        return HexUtils.roundAxial(q, r);
    }

    // ========== Spatial Queries ==========

    getHexKey(q: number, r: number): string {
        return HexUtils.getHexKey(q, r);
    }

    getNeighbors(q: number, r: number): HexUtils.HexCoord[] {
        return HexUtils.getNeighbors(q, r);
    }

    distance(q1: number, r1: number, q2: number, r2: number): number {
        return HexUtils.distance(q1, r1, q2, r2);
    }

    getHexesInRange(q: number, r: number, range: number): HexUtils.HexCoord[] {
        return HexUtils.getHexesInRange(q, r, range);
    }

    getRing(q: number, r: number, radius: number): HexUtils.HexCoord[] {
        // HexUtils usually handles range, but maybe lack specific ring.
        // If HexUtils doesn't have it, we implement it or iterate range.
        // Let's implement generically based on cube co-ords difference.
        // Or cleaner: range(rad) minus range(rad-1).
        // Optimization: just walk the ring.
        const results: HexUtils.HexCoord[] = [];
        if (radius === 0) return [{ q, r }];

        // Simple walk: start at neighbor 4 * radius, then walk 6 directions * radius steps?
        // Let's rely on basic logic if utils missing:
        // Actually, getHexesInRange is inclusive.
        // Let's assume for now we use getHexesInRange and filter by distance === radius.
        const inRange = this.getHexesInRange(q, r, radius);
        return inRange.filter(h => this.distance(q, r, h.q, h.r) === radius);
    }

    // ========== Hex Data Management ==========

    setHex(q: number, r: number, data: Partial<HexData>, site?: any): void {
        const key = this.getHexKey(q, r);
        const existing = this.hexes.get(key) || { q, r };

        let newData = { ...existing, ...data, q, r };
        // Handle MapManager passing 4 args (q, r, terrainType, site) sometimes through setHex(q,r, terrain, site) logic mismatch
        // Wait, the MapManager was calling: setHex(hex.q, hex.r, hex.terrain, hex.site);
        // JS allowed that bad signature. I'll handle it by checking if data is string (legacy call) or overload.
        // But cleaner to fix MapManager. I will fix MapManager to pass object. 
        // Oh wait, I am converting MapManager too.

        // Let's stick to proper signature: setHex(q, r, data)
        // If site is passed separately, merge it.
        if (site) {
            newData.site = site;
        }

        this.hexes.set(key, newData);
    }

    getHex(q: number, r: number): HexData | null {
        return this.hexes.get(this.getHexKey(q, r)) || null;
    }

    hasHex(q: number, r: number): boolean {
        return this.hexes.has(this.getHexKey(q, r));
    }

    // ========== Pathfinding ==========

    getMovementCost(q: number, r: number, isNight: boolean = false, hasFlight: boolean = false): number {
        if (hasFlight) return 1;

        const hex = this.getHex(q, r);
        if (!hex) return 999;

        if (this.terrainSystem && hex.terrain) {
            return this.terrainSystem.getMovementCost(hex.terrain, isNight);
        }

        // Fallback defaults
        const costs: Record<string, number> = { plains: 2, forest: 3, hills: 3, mountains: 5, desert: 5, wasteland: 3, water: 999 };
        const cost = (hex.terrain && costs[hex.terrain]) ? costs[hex.terrain] : 2;

        if (isNight) {
            if (hex.terrain === 'forest') return 5;
            if (hex.terrain === 'desert') return 3;
        }

        return cost;
    }

    getReachableHexes(startPos: HexUtils.HexCoord, movementPoints: number, isDay: boolean, hasFlight: boolean = false): HexUtils.HexCoord[] {
        if (!startPos) return [];

        const reachable: HexUtils.HexCoord[] = [];
        const queue = [{ q: startPos.q, r: startPos.r, cost: 0 }];
        const visited = new Map<string, number>();
        visited.set(this.getHexKey(startPos.q, startPos.r), 0);

        while (queue.length > 0) {
            const current = queue.shift()!;

            if (current.q !== startPos.q || current.r !== startPos.r) {
                reachable.push({ q: current.q, r: current.r });
            }

            for (const neighbor of this.getNeighbors(current.q, current.r)) {
                if (!this.hasHex(neighbor.q, neighbor.r)) continue;

                const moveCost = this.getMovementCost(neighbor.q, neighbor.r, !isDay, hasFlight);
                const totalCost = current.cost + moveCost;

                if (totalCost <= movementPoints) {
                    const key = this.getHexKey(neighbor.q, neighbor.r);
                    if (!visited.has(key) || visited.get(key)! > totalCost) {
                        visited.set(key, totalCost);
                        queue.push({ ...neighbor, cost: totalCost });
                    }
                }
            }
        }

        return reachable;
    }

    // ========== State Persistence ==========

    getState(): any {
        return {
            hexes: Array.from(this.hexes.entries())
        };
    }

    loadState(state: any): void {
        if (!state) return;
        if (state.hexes) {
            this.hexes = new Map(state.hexes);
        }
    }

    /**
     * Reveals all EXISTING adjacent hexes that are currently hidden.
     */
    exploreAdjacent(pos: HexUtils.HexCoord): HexUtils.HexCoord[] {
        const neighbors = this.getNeighbors(pos.q, pos.r);
        const revealed: HexUtils.HexCoord[] = [];

        neighbors.forEach(n => {
            const hex = this.getHex(n.q, n.r);
            if (hex && !hex.revealed) {
                hex.revealed = true;
                revealed.push({ q: n.q, r: n.r });
            }
        });

        return revealed;
    }

    // Helper used by InteractionController 'selectHex' logic maybe? 
    selectHex(q: number, r: number) {
        // Only visual logic usually, handled by Renderer?
        // InteractionController calls game.hexGrid.selectHex which is likely delegated to renderer or stored here?
        // JS version didn't have selectHex. It meant `game.hexGridRenderer.selectHex`?
        // Checking InteractionController.js: `this.game.hexGrid.selectHex(q, r)`
        // Wait, legacy code called it on hexGrid. 
        // Let's check main game.js glue. Usually game.hexGrid is Logic, game.hexGridRenderer is Renderer.
        // Unless game.hexGrid proxies?

        // I will add a no-op or state tracker here if needed, or update InteractionController to call Renderer.
        // InteractionController usually manages UI state.
        // Let's add a placeholder or state field.
    }
}
