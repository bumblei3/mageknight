import { SITE_TYPES } from '../sites.js';
import { TERRAIN_TYPES } from '../constants.js';

export const MINING_EXPEDITION = {
    id: 'mining_expedition',
    name: 'Mining Expedition',
    description: 'Survive 3 days and 3 nights while liberating 3 Crystal Mines from the Deep Orcs.',
    victoryConditions: {
        mines: 3,
        boss: true
    },
    mapConfig: {
        startTile: [
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.MOUNTAINS, // N - Mine potential
            TERRAIN_TYPES.HILLS,     // NE - Mine potential
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.HILLS,     // SE
            TERRAIN_TYPES.MOUNTAINS, // SW
            TERRAIN_TYPES.WATER      // NW
        ],
        deck: [
            [TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST],
            [TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.WATER],
            [TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.FOREST]
        ]
    },
    config: {
        rounds: 6,
        boss: 'dragon_lord', // Placeholder boss or maybe just "Orc Warlord"
        enemyRules: {
            [SITE_TYPES.MINE]: ['deep_orc', 'crystal_golem']
        }
    }
};
