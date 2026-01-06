import { TERRAIN_TYPES } from './constants.js';
import { SITE_TYPES, Site } from './sites.js';

export class MapManager {
    constructor(hexGrid) {
        this.hexGrid = hexGrid;
        this.tilesDeck = [];
        this.initializeDeck();
        this.revealedHexes = new Set();
        this.worldEvents = null; // Will be set by Game
    }

    setWorldEventManager(manager) {
        this.worldEvents = manager;
    }

    initializeDeck() {
        // Define some tile patterns (Center + 6 neighbors)
        // Neighbors order: E, NE, NW, W, SW, SE (0 to 5)
        this.tilesDeck = [
            // Countryside Tiles
            [TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.WATER],
            [TERRAIN_TYPES.FOREST, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS],
            [TERRAIN_TYPES.HILLS, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.PLAINS],
            [TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.WATER, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.PLAINS],

            // Core Tiles (More dangerous)
            [TERRAIN_TYPES.DESERT, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST],
            [TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST]
        ];
    }

    // Create the standard starting map layout
    createStartingMap(scenario = null) {
        // Default layout if no scenario
        let centerTile = [
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.HILLS,
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.DESERT,
            TERRAIN_TYPES.WATER
        ];

        if (scenario && scenario.mapConfig && scenario.mapConfig.startTile) {
            centerTile = scenario.mapConfig.startTile;
        }

        // Apply Scenario Deck if provided
        if (scenario && scenario.mapConfig && scenario.mapConfig.deck) {
            this.tilesDeck = [...scenario.mapConfig.deck]; // Copy array
        } else {
            // Reset to defaults if no scenario deck is present
            this.initializeDeck();
        }

        // Create starting map (multiple tiles for enemy spawning) (0,0)
        this.placeTile(0, 0, centerTile);

        // Add adjacent tiles for enemy spawning areas or scenario specifics
        // If Mines scenario, maybe ensure nearby tiles have mines?
        // For now, keep standard adjacent but inject Mine potential via getRandomSiteForTerrain logic update

        // East (3,0)
        this.placeTile(3, 0, [
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.HILLS,
            TERRAIN_TYPES.WASTELAND,
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.HILLS,
            TERRAIN_TYPES.FOREST
        ]);

        // South-West (0,3)
        this.placeTile(0, 3, [
            TERRAIN_TYPES.HILLS, // Hill often gets Keep or Mine
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.HILLS,
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.HILLS,
            TERRAIN_TYPES.DESERT
        ]);

        // North-West (-3,0)
        this.placeTile(-3, 0, [
            TERRAIN_TYPES.DESERT,
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.HILLS,
            TERRAIN_TYPES.MOUNTAINS, // Mountain often gets Mine
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.PLAINS
        ]);

        // Reveal starting area
        this.revealMap(0, 0, 4);
    }

    // Check if exploration is possible from a given hex
    canExplore(q, r) {
        // Check if any neighbor is missing
        const neighbors = this.hexGrid.getNeighbors(q, r);
        return neighbors.some(n => !this.hexGrid.hasHex(n.q, n.r));
    }

    // Explore from a specific hex
    explore(fromQ, fromR) {
        if (this.tilesDeck.length === 0) {
            return { success: false, message: 'Keine weiteren Gebiete zu erkunden.' };
        }

        // Find a valid spot for a new tile
        // We look for a missing neighbor to place the CENTER of the new tile
        const neighbors = this.hexGrid.getNeighbors(fromQ, fromR);

        // Prioritize direction away from center (0,0) to expand outward
        // Simple heuristic: choose neighbor furthest from 0,0 that is empty
        const emptyNeighbors = neighbors.filter(n => !this.hexGrid.hasHex(n.q, n.r));

        if (emptyNeighbors.length === 0) {
            return { success: false, message: 'Kein Platz zum Erkunden.' };
        }

        // Sort by distance from origin (0,0) to expand outwards
        emptyNeighbors.sort((a, b) => {
            const distA = this.hexGrid.distance(0, 0, a.q, a.r);
            const distB = this.hexGrid.distance(0, 0, b.q, b.r);
            return distB - distA;
        });

        const targetCenter = emptyNeighbors[0];
        const tileTerrains = this.tilesDeck.shift();

        this.placeTile(targetCenter.q, targetCenter.r, tileTerrains);

        // Check for Event
        let event = null;
        if (this.worldEvents) {
            event = this.worldEvents.checkForEvent(tileTerrains[0]);
            // Add event data to the return object
        }

        return {
            success: true,
            message: 'Neues Gebiet entdeckt!',
            center: targetCenter,
            event: event
        };
    }

    placeTile(centerQ, centerR, terrains) {
        // Place center
        this.hexGrid.setHex(centerQ, centerR, { terrain: terrains[0], revealed: false });

        // Place neighbors
        const neighbors = this.hexGrid.getNeighbors(centerQ, centerR);
        neighbors.forEach((n, i) => {
            // Only place if empty to avoid overwriting existing map
            if (!this.hexGrid.hasHex(n.q, n.r)) {
                const terrain = terrains[i + 1] || TERRAIN_TYPES.PLAINS;
                const hexData = { terrain, revealed: false };

                // Randomly add a site based on terrain
                // Chance: 20% per hex
                if (Math.random() < 0.2) {
                    const siteType = this.getRandomSiteForTerrain(terrain);
                    if (siteType) {
                        hexData.site = new Site(siteType);
                    }
                }

                this.hexGrid.setHex(n.q, n.r, hexData);
            }
        });
    }

    getRandomSiteForTerrain(terrain) {
        switch (terrain) {
        case TERRAIN_TYPES.PLAINS:
            return Math.random() < 0.7 ? SITE_TYPES.VILLAGE : null;
        case TERRAIN_TYPES.HILLS: {
            // Hills can have Keeps, Monasteries, or Mines
            const roll = Math.random();
            if (roll < 0.3) return SITE_TYPES.KEEP;
            if (roll < 0.6) return SITE_TYPES.MONASTERY;
            if (roll < 0.8) return SITE_TYPES.MINE;
            return null;
        }
        case TERRAIN_TYPES.FOREST: {
            const roll = Math.random();
            if (roll < 0.2) return SITE_TYPES.SPAWNING_GROUNDS;
            if (roll < 0.4) return SITE_TYPES.KEEP; // Adjusted chance
            return null;
        }
        case TERRAIN_TYPES.WASTELAND: {
            // Wastelands usually Mage Towers, Dungeons, Ruins, or Labyrinths
            const wRoll = Math.random();
            if (wRoll < 0.2) return SITE_TYPES.LABYRINTH;
            if (wRoll < 0.4) return SITE_TYPES.MAGE_TOWER;
            if (wRoll < 0.6) return SITE_TYPES.TOMB;
            if (wRoll < 0.8) return SITE_TYPES.DUNGEON;
            return SITE_TYPES.RUIN;
        }
        case TERRAIN_TYPES.DESERT: {
            const dRoll = Math.random();
            if (dRoll < 0.3) return SITE_TYPES.LABYRINTH;
            if (dRoll < 0.6) return SITE_TYPES.MAGE_TOWER;
            return null;
        }
        case TERRAIN_TYPES.MOUNTAINS:
            // Mountains are prime for Mines
            return Math.random() < 0.7 ? SITE_TYPES.MINE : SITE_TYPES.DUNGEON;
        case TERRAIN_TYPES.WATER:
            return null;
        default:
            return null;
        }
    }

    // Reveal map around a center point
    revealMap(q, r, range = 2) {
        const hexes = this.hexGrid.getHexesInRange(q, r, range);
        let newReveals = 0;

        hexes.forEach(hex => {
            if (this.hexGrid.hasHex(hex.q, hex.r)) {
                const hexData = this.hexGrid.getHex(hex.q, hex.r);
                if (!hexData.revealed) {
                    this.hexGrid.setHex(hex.q, hex.r, { ...hexData, revealed: true });
                    this.revealedHexes.add(`${hex.q},${hex.r}`);
                    newReveals++;
                }
            }
        });

        return newReveals;
    }
}
