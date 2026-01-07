import { Scenario } from '../game/ScenarioManager';
import { TERRAIN_TYPES } from '../constants';

export const MINING_EXPEDITION: Scenario = {
    id: 'mining_expedition',
    name: 'Mining Expedition',
    description: 'Befreie die Kristallminen von den Besetzern.',
    victoryConditions: {
        mines: 3,
        rounds: 6
    },
    mapConfig: {
        startTile: [
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.HILLS,
            TERRAIN_TYPES.MOUNTAINS,
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.HILLS,
            TERRAIN_TYPES.WASTELAND
        ],
        deckDistribution: 'mines_focused'
    }
};
