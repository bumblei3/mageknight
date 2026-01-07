import { HexGridLogic, HexData } from './hexgrid/HexGridLogic';
import { HexGridRenderer } from './hexgrid/HexGridRenderer';
import { Terrain } from './terrain';
import * as HexUtils from './utils/hexUtils';

/**
 * Facade for HexGrid system, combining Logic and Renderer.
 */
export class HexGrid {
    public logic: HexGridLogic;
    public renderer: HexGridRenderer | null = null;
    public canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.logic = new HexGridLogic(40); // Default hex size
        if (canvas) {
            this.renderer = new HexGridRenderer(canvas, this.logic);
        }
    }

    setTerrainSystem(terrainSystem: Terrain) {
        this.logic.setTerrainSystem(terrainSystem);
    }

    // Proxy methods to Logic
    axialToPixelOffset(q: number, r: number) { return this.logic.axialToPixelOffset(q, r); }
    pixelOffsetToAxial(x: number, y: number) { return this.logic.pixelOffsetToAxial(x, y); }
    // Note: Renderer uses center-relative pixel coords, logic uses offset.
    // We expose renderer's helper if available for world coords?
    axialToPixel(q: number, r: number) {
        return this.renderer ? this.renderer.axialToPixel(q, r) : this.logic.axialToPixelOffset(q, r); // Fallback to offset if no renderer?
    }

    getHexKey(q: number, r: number) { return this.logic.getHexKey(q, r); }
    getNeighbors(q: number, r: number) { return this.logic.getNeighbors(q, r); }
    distance(q1: number, r1: number, q2: number, r2: number) { return this.logic.distance(q1, r1, q2, r2); }
    getHexesInRange(q: number, r: number, range: number) { return this.logic.getHexesInRange(q, r, range); }
    getRing(q: number, r: number, radius: number) { return this.logic.getRing(q, r, radius); } // Added method

    setHex(q: number, r: number, data: Partial<HexData>, site?: any) {
        this.logic.setHex(q, r, data, site);
    }


    getHex(q: number, r: number) { return this.logic.getHex(q, r); }
    hasHex(q: number, r: number) { return this.logic.hasHex(q, r); }

    get hexes() { return this.logic.hexes; }

    getMovementCost(q: number, r: number, isNight: boolean, hasFlight: boolean) {
        return this.logic.getMovementCost(q, r, isNight, hasFlight);
    }

    getReachableHexes(startPos: HexUtils.HexCoord, movementPoints: number, isDay: boolean, hasFlight: boolean) {
        return this.logic.getReachableHexes(startPos, movementPoints, isDay, hasFlight);
    }

    getState() { return this.logic.getState(); }
    loadState(state: any) { this.logic.loadState(state); }

    selectHex(q: number, r: number) {
        if (this.renderer) this.renderer.selectHex(q, r);
    }

    setTimeOfDay(isNight: boolean) {
        if (this.renderer) this.renderer.setTimeOfDay(isNight);
    }

    clearSelection() {
        if (this.renderer) this.renderer.clearSelection();
    }

    // Proxy methods to Renderer
    render(hero: any, enemies: any[]) {
        if (this.renderer) this.renderer.render(hero, enemies);
    }

    highlightHexes(hexes: { q: number, r: number }[]) {
        if (this.renderer) this.renderer.highlightHexes(hexes);
    }

    clearHighlights() {
        if (this.renderer) this.renderer.clearHighlights();
    }
}
