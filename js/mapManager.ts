import { HexGridLogic } from './hexgrid/HexGridLogic';
import { Terrain, TerrainType } from './terrain';
import { TERRAIN_TYPES } from './constants';
import { logger } from './logger';
import { SITE_TYPES } from './sites';
import { Site } from './sites';
import { HEX_DIRECTIONS } from './utils/hexUtils';
import { buildScenarioDeck, normalizeTerrains, ScenarioTile } from './map/tileDeck';

export interface MapData {
    hexes: Array<{ q: number; r: number; terrain: TerrainType; site?: any }>;
}

export interface SitePlacement {
    type: string;
    q: number;
    r: number;
    count?: number;
    radius?: number;
}

export interface PlacedEnemy {
    type: string;
    q: number;
    r: number;
}

export interface ExploreResult {
    success: boolean;
    event?: any;
    placed?: Array<{ q: number; r: number }>;
    enemies?: PlacedEnemy[];
    siteType?: string | null;
    siteName?: string | null;
}

export class MapManager {
    private game: any;
    private hexGrid: HexGridLogic;
    public tilesDeck: ScenarioTile[] = [];

    constructor(game: any) {
        this.game = game;
        this.hexGrid = game.hexGrid;
        this.initializeDeck();
    }

    initializeDeck() {
        this.tilesDeck = buildScenarioDeck({ deckDistribution: 'countryside' }, 'start', 10);
    }

    getDeckState(): ScenarioTile[] {
        return this.tilesDeck.map((tile) => ({
            terrains: [...tile.terrains],
            siteType: tile.siteType,
            enemyTypes: [...tile.enemyTypes]
        }));
    }

    loadDeckState(deck: ScenarioTile[] | null | undefined): void {
        if (!Array.isArray(deck)) return;
        this.tilesDeck = deck
            .filter((tile) => tile && Array.isArray(tile.terrains))
            .map((tile) => ({
                terrains: normalizeTerrains(tile.terrains),
                siteType: tile.siteType || null,
                enemyTypes: Array.isArray(tile.enemyTypes) ? [...tile.enemyTypes] : []
            }));
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

        if (scenarioData && scenarioData.mapConfig) {
            const seed = scenarioData.id || scenarioData.mapConfig.deckDistribution || 'scenario';
            this.tilesDeck = buildScenarioDeck(scenarioData.mapConfig, seed);
        }

        if (scenarioData && scenarioData.mapConfig && scenarioData.mapConfig.startTile) {
            this.createMapFromStartTile(scenarioData.mapConfig.startTile);
            this.placeStartingHaven();
        } else if (scenarioData && scenarioData.hexes) {
            this.loadMapFromData(scenarioData);
        } else {
            this.generateDefaultMap();
            this.placeStartingHaven();
        }

        // Goal sites stay in the scenario deck and appear when a tile is explored.

        // Reveal starting area
        this.revealStartingArea();
    }

    /**
     * Puts one unguarded village on the start tile. Scenario goals are not
     * placed here; they arrive with explored tiles.
     */
    private placeStartingHaven(): void {
        const candidates = [
            ...this.hexGrid.getNeighbors(0, 0),
            { q: 0, r: 0 }
        ];
        const spot = candidates.find((coord) => {
            const hex = this.hexGrid.getHex(coord.q, coord.r);
            return hex && !hex.site && hex.terrain !== TERRAIN_TYPES.WATER;
        });
        if (!spot) return;

        const hex = this.hexGrid.getHex(spot.q, spot.r);
        if (!hex || hex.site) return;
        hex.site = new Site(SITE_TYPES.VILLAGE);
        logger.info(`Placed village at (${spot.q}, ${spot.r})`);
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
     * Draws the next tile and lays its empty hexes around the given center.
     * Existing hexes stay as they are, so the start tile is never overwritten.
     */
    addMapTile(centerQ: number, centerR: number, tileType: 'countryside' | 'core' = 'countryside'): ExploreResult {
        const tile = this.tilesDeck.shift();
        if (!tile) return { success: false };
        if (tileType === 'core' && !tile.siteType) {
            tile.siteType = SITE_TYPES.CITY;
            tile.enemyTypes = ['guard', 'dragon'];
        }
        const placed = this.placeTile(centerQ, centerR, tile);
        if (!placed.success) this.tilesDeck.unshift(tile);
        return placed;
    }

    /**
     * Checks if exploration is possible from the given position
     */
    canExplore(q: number, r: number): boolean {
        if (this.tilesDeck.length === 0) return false;
        const neighbors = this.hexGrid.getNeighbors(q, r);
        return neighbors.some(n => !this.hexGrid.hasHex(n.q, n.r));
    }

    /**
     * Lays the next 7-hex scenario tile onto the first open edge.
     * The tile center is that unknown neighbor, so it shares the hero hex
     * and does not replace any hex that is already on the map.
     */
    explore(q: number, r: number): ExploreResult {
        logger.debug(`MapManager: Exploring from ${q},${r}`);
        if (!this.canExplore(q, r)) {
            logger.warn('MapManager: canExplore returned false');
            return { success: false };
        }

        const anchor = this.hexGrid.getNeighbors(q, r).find(n => !this.hexGrid.hasHex(n.q, n.r));
        const tile = anchor ? this.tilesDeck.shift() : undefined;
        if (!anchor || !tile) return { success: false };

        const placed = this.placeTile(anchor.q, anchor.r, tile);
        if (!placed.success) {
            this.tilesDeck.unshift(tile);
            return { success: false };
        }

        let event = null;
        if (this.worldEventManager && Math.random() > 0.7) {
            event = this.worldEventManager.getRandomEvent();
        }

        return { ...placed, event };
    }

    private placeTile(centerQ: number, centerR: number, tile: ScenarioTile): ExploreResult {
        const offsets = [{ q: 0, r: 0 }, ...HEX_DIRECTIONS];
        const placed: Array<{ q: number; r: number }> = [];
        let siteHex: { q: number; r: number } | null = null;
        let siteName: string | null = null;

        offsets.forEach((offset, index) => {
            const q = centerQ + offset.q;
            const r = centerR + offset.r;
            if (this.hexGrid.hasHex(q, r)) return;

            const wantsSite = tile.siteType && siteHex === null && index > 0;
            const site = wantsSite && tile.siteType ? new Site(tile.siteType) : undefined;
            this.hexGrid.setHex(q, r, {
                terrain: tile.terrains[index] || TERRAIN_TYPES.PLAINS,
                revealed: true,
                site
            });
            placed.push({ q, r });
            if (site) {
                siteHex = { q, r };
                siteName = site.getName();
                this.notifySpawningGrounds(q, r, site.type);
            }
        });

        if (placed.length === 0) return { success: false };

        if (tile.siteType && !siteHex) {
            const fallback = placed[0];
            const hex = this.hexGrid.getHex(fallback.q, fallback.r);
            if (hex && !hex.site) {
                const site = new Site(tile.siteType);
                hex.site = site;
                siteHex = fallback;
                siteName = site.getName();
                this.notifySpawningGrounds(fallback.q, fallback.r, site.type);
            }
        }

        const guard = siteHex || placed[0];
        const enemies: PlacedEnemy[] = tile.enemyTypes.map((type) => ({
            type,
            q: guard.q,
            r: guard.r
        }));

        logger.info(`Placed tile at (${centerQ}, ${centerR}) with ${placed.length} new hexes`);
        return {
            success: true,
            placed,
            enemies,
            siteType: siteHex ? tile.siteType : null,
            siteName
        };
    }

    private notifySpawningGrounds(q: number, r: number, siteType: string): void {
        if (!this.worldEventManager || siteType !== SITE_TYPES.SPAWNING_GROUNDS) return;
        const hex = this.hexGrid.getHex(q, r);
        this.worldEventManager.onTileRevealed(q, r, hex);
    }

    /**
     * Places scenario-specific sites on the map
     */
    placeScenarioSites(placements: SitePlacement[]): void {
        placements.forEach(placement => {
            const count = placement.count || 1;
            const radius = placement.radius || 2;

            for (let i = 0; i < count; i++) {
                // Try primary position first
                let q = placement.q;
                let r = placement.r;
                let attempts = 0;

                // If count > 1, distribute around the center within radius
                if (count > 1) {
                    const ring = this.hexGrid.getRing(placement.q, placement.r, radius);
                    const validPositions = ring.filter(pos =>
                        this.hexGrid.hasHex(pos.q, pos.r) &&
                        !this.hexGrid.getHex(pos.q, pos.r)?.site
                    );

                    if (validPositions.length > 0) {
                        const pos = validPositions[i % validPositions.length];
                        q = pos.q;
                        r = pos.r;
                    } else {
                        // Fallback: find any empty hex within radius
                        const inRange = this.hexGrid.getHexesInRange(placement.q, placement.r, radius);
                        const emptyHexes = inRange.filter(pos =>
                            this.hexGrid.hasHex(pos.q, pos.r) &&
                            !this.hexGrid.getHex(pos.q, pos.r)?.site
                        );
                        if (emptyHexes.length > 0) {
                            const pos = emptyHexes[i % emptyHexes.length];
                            q = pos.q;
                            r = pos.r;
                        }
                    }
                }

                // Final check: ensure the hex exists and has no site
                while (attempts < 10) {
                    if (this.hexGrid.hasHex(q, r)) {
                        const hex = this.hexGrid.getHex(q, r);
                        if (hex && !hex.site) {
                            hex.site = new Site(placement.type);
                            logger.info(`Placed ${placement.type} at (${q}, ${r})`);
                            break;
                        }
                    }
                    // Try adjacent
                    const neighbors = this.hexGrid.getNeighbors(q, r);
                    const emptyNeighbor = neighbors.find(n =>
                        this.hexGrid.hasHex(n.q, n.r) &&
                        !this.hexGrid.getHex(n.q, n.r)?.site
                    );
                    if (emptyNeighbor) {
                        q = emptyNeighbor.q;
                        r = emptyNeighbor.r;
                    } else {
                        break;
                    }
                    attempts++;
                }
            }
        });
    }
}