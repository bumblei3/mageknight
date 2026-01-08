import { HexGridLogic } from './hexgrid/HexGridLogic';
import { Terrain, TerrainType } from './terrain';
import { TERRAIN_TYPES } from './constants';
import { logger } from './logger';

export interface MapData {
    hexes: Array<{ q: number; r: number; terrain: TerrainType; site?: any }>;
}

export class MapManager {
    private game: any;
    private hexGrid: HexGridLogic;
    public tilesDeck: TerrainType[][] = [];

    constructor(game: any) {
        this.game = game;
        this.hexGrid = game.hexGrid;
        this.initializeDeck();
    }

    initializeDeck() {
        // Create a dummy deck for testing/placeholder logic
        // 10 tiles, each with 7 hexes
        for (let i = 0; i < 10; i++) {
            const tile = new Array(7).fill(TERRAIN_TYPES.PLAINS);
            // Vary terrains slightly
            tile[1] = TERRAIN_TYPES.FOREST;
            tile[2] = TERRAIN_TYPES.HILLS;
            this.tilesDeck.push(tile);
        }
    }

    private getRandomTerrain(): TerrainType {
        const rand = Math.random();
        if (rand < 0.4) return TERRAIN_TYPES.PLAINS;
        if (rand < 0.6) return TERRAIN_TYPES.FOREST;
        if (rand < 0.8) return TERRAIN_TYPES.HILLS;
        if (rand < 0.9) return TERRAIN_TYPES.MOUNTAINS;
        return TERRAIN_TYPES.WASTELAND;
    }

    private worldEventManager: any;

    setWorldEventManager(manager: any) {
        this.worldEventManager = manager;
    }

    /**
     * Initializes the map with a predefined scenario layout or empty
     */
    createStartingMap(scenarioData: any | null = null): void {
        console.log('Initializing Map...');

        if (scenarioData && scenarioData.mapConfig && scenarioData.mapConfig.startTile) {
            this.createMapFromStartTile(scenarioData.mapConfig.startTile);
        } else if (scenarioData && scenarioData.hexes) {
            this.loadMapFromData(scenarioData);
        } else {
            this.generateDefaultMap();
        }

        // Reveal starting area
        this.revealStartingArea();
    }

    private createMapFromStartTile(startTile: TerrainType[]): void {
        // center is [0], neighbors are [1-6]
        this.hexGrid.setHex(0, 0, { terrain: startTile[0] || TERRAIN_TYPES.PLAINS });

        const neighbors = this.hexGrid.getNeighbors(0, 0);
        neighbors.forEach((n: any, i: number) => {
            const terrain = startTile[i + 1] || TERRAIN_TYPES.PLAINS;
            this.hexGrid.setHex(n.q, n.r, { terrain });
        });
    }

    /**
     * Generates a default starter map (wedge shape)
     */
    generateDefaultMap(): void {
        // Center - Portal
        this.hexGrid.setHex(0, 0, { terrain: TERRAIN_TYPES.PLAINS });

        // Immediate surroundings (Radius 1)
        const radius1 = this.hexGrid.getRing(0, 0, 1);
        radius1.forEach(hex => {
            this.hexGrid.setHex(hex.q, hex.r, { terrain: this.getRandomTerrain() });
        });

        // Radius 2-3 - Exploration zone
        for (let r = 2; r <= 3; r++) {
            const ring = this.hexGrid.getRing(0, 0, r);
            ring.forEach(hex => {
                // Procedural generation logic here
                // For now, simpler patterns
                this.hexGrid.setHex(hex.q, hex.r, { terrain: TERRAIN_TYPES.PLAINS }); // Placeholder, real logic handles tiles
            });
        }
    }

    /**
     * Loads map from a save or scenario definition
     */
    loadMapFromData(data: MapData): void {
        data.hexes.forEach(hex => {
            this.hexGrid.setHex(hex.q, hex.r, { terrain: hex.terrain }, hex.site);
        });
    }

    /**
     * Reveals the area around the hero's start position
     */
    revealStartingArea(): void {
        // Radius 2 is usually revealed at start (depending on rules/day)
        const startQ = 0;
        const startR = 0;

        // Reveal center
        const center = this.hexGrid.getHex(startQ, startR);
        if (center) center.revealed = true;

        // Reveal neighbors
        const neighbors = this.hexGrid.getNeighbors(startQ, startR);
        neighbors.forEach(n => {
            const hex = this.hexGrid.getHex(n.q, n.r);
            if (hex) hex.revealed = true;
        });
    }

    /**
     * Adds a new map tile (group of 7 hexes) at the specified coordinate
     * Logic for map tiles would go here (Core Tiles vs Countryside Tiles)
     */
    addMapTile(centerQ: number, centerR: number, tileType: 'countryside' | 'core'): void {
        // TODO: Implement actual tile deck logic
        // For now, just filling hexes
        const hexes = this.hexGrid.getHexesInRange(centerQ, centerR, 1);
        hexes.forEach(h => {
            // If empty, fill
            if (!this.hexGrid.hasHex(h.q, h.r)) {
                this.hexGrid.setHex(h.q, h.r, { terrain: TERRAIN_TYPES.PLAINS });
            }
        });
    }
    /**
     * Checks if exploration is possible from the given position
     */
    canExplore(q: number, r: number): boolean {
        const neighbors = this.hexGrid.getNeighbors(q, r);
        return neighbors.some(n => !this.hexGrid.hasHex(n.q, n.r));
    }

    /**
     * Explores adjacent unknown hexes from specified position
     */
    explore(q: number, r: number): { success: boolean; event?: any } {
        logger.debug(`MapManager: Exploring from ${q},${r}`);
        if (!this.canExplore(q, r)) {
            logger.warn('MapManager: canExplore returned false');
            return { success: false };
        }

        const neighbors = this.hexGrid.getNeighbors(q, r);
        const unknownNeighbors = neighbors.filter(n => !this.hexGrid.hasHex(n.q, n.r));

        if (unknownNeighbors.length > 0) {
            // Simplistic exploration: reveal all direct neighbors
            unknownNeighbors.forEach(n => {
                this.hexGrid.setHex(n.q, n.r, { terrain: this.getRandomTerrain() });
                const hex = this.hexGrid.getHex(n.q, n.r);
                if (hex) hex.revealed = true;
            });

            // Randomly trigger a world event if possible
            let event = null;
            if (this.worldEventManager && Math.random() > 0.7) {
                event = this.worldEventManager.getRandomEvent();
            }

            return { success: true, event };
        }

        return { success: false };
    }
}
