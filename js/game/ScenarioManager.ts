import { SITE_TYPES } from '../sites';
import { TERRAIN_TYPES, TerrainType } from '../constants';
import { logger } from '../logger';
import { MINING_EXPEDITION } from '../scenarios/MiningExpedition';

/**
 * Interface for scenario victory conditions.
 */
export interface VictoryConditions {
    mines?: number;
    keeps?: number;
    spawning_grounds?: number;
    rounds?: number;
    [key: string]: number | undefined;
}

/**
 * Interface for scenario definition.
 */
export interface Scenario {
    id: string;
    name: string;
    description: string;
    victoryConditions: VictoryConditions;
    mapConfig: {
        startTile: TerrainType[];
        deckDistribution?: string;
        deck?: TerrainType[][];
    };
}

/**
 * Manages game scenarios and victory tracking.
 */
export class ScenarioManager {
    private game: any;
    private currentScenario: string;
    private scenarios: Record<string, Scenario>;

    constructor(game: any) {
        this.game = game;
        this.currentScenario = 'mines_freedom'; // Default

        this.scenarios = {
            'mines_freedom': {
                id: 'mines_freedom',
                name: 'Freiheit für die Minen',
                description: 'Draconische Warlords haben die Kristallminen besetzt. Befreie 2 Minen und erobere eine Festung, um die Region zu sichern.',
                victoryConditions: {
                    mines: 2,
                    keeps: 1
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
            },
            'mining_expedition': MINING_EXPEDITION as unknown as Scenario,
            'druid_nights': {
                id: 'druid_nights',
                name: 'Nächte der Druiden',
                description: 'Verdorbene Druiden beschwören nachts Monster. Überlebe 6 Runden (3 Tage, 3 Nächte) und zerstöre 2 Brutstätten.',
                victoryConditions: {
                    rounds: 6,
                    spawning_grounds: 2
                },
                mapConfig: {
                    startTile: [
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.WASTELAND,
                        TERRAIN_TYPES.WASTELAND,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.WATER,
                        TERRAIN_TYPES.PLAINS
                    ],
                    deck: [
                        [TERRAIN_TYPES.FOREST, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.WATER, TERRAIN_TYPES.FOREST],
                        [TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.WATER],
                        [TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS]
                    ]
                }
            }
        };
    }

    /**
     * Loads a scenario by ID.
     */
    loadScenario(scenarioId: string): Scenario | null {
        if (this.scenarios[scenarioId]) {
            this.currentScenario = scenarioId;
            logger.info(`Loaded scenario: ${this.scenarios[scenarioId].name}`);
            return this.scenarios[scenarioId];
        }
        return null;
    }

    /**
     * Gets the currently active scenario.
     */
    getCurrentScenario(): Scenario {
        return this.scenarios[this.currentScenario];
    }

    /**
     * Checks if the victory conditions for the current scenario are met.
     */
    checkVictory(): { victory: boolean, message: string } | false {
        const scenario = this.getCurrentScenario();
        if (!scenario) return false;

        // Count conquered sites by type
        let conqueredMines = 0;
        let conqueredKeeps = 0;
        let conqueredSpawns = 0;

        // Iterate all hexes
        if (this.game.hexGrid && this.game.hexGrid.hexes) {
            for (const hex of this.game.hexGrid.hexes.values()) {
                if (hex.site && hex.site.conquered) {
                    if (hex.site.type === SITE_TYPES.MINE) conqueredMines++;
                    if (hex.site.type === SITE_TYPES.KEEP) conqueredKeeps++;
                    if (hex.site.type === SITE_TYPES.SPAWNING_GROUNDS) conqueredSpawns++;
                }
            }
        }

        if (scenario.id === 'mines_freedom') {
            const minesNeeded = scenario.victoryConditions.mines || 0;
            const keepsNeeded = scenario.victoryConditions.keeps || 0;

            if (conqueredMines >= minesNeeded && conqueredKeeps >= keepsNeeded) {
                return {
                    victory: true,
                    message: `${scenario.name} erfolgreich abgeschlossen! Alle Minen und Festungen sind befreit.`
                };
            }
        } else if (scenario.id === 'druid_nights') {
            const spawnsNeeded = scenario.victoryConditions.spawning_grounds || 0;
            if (conqueredSpawns >= spawnsNeeded) {
                return {
                    victory: true,
                    message: 'Die Druiden-Rituale wurden gestoppt! Deine Tapferkeit hat die Region gerettet.'
                };
            }
        } else if (scenario.id === 'mining_expedition') {
            const minesNeeded = scenario.victoryConditions.mines || 0;
            if (conqueredMines >= minesNeeded) {
                return {
                    victory: true,
                    message: 'Mission erfüllt! Die Minen sind gesichert.'
                };
            }
        }

        return false;
    }

    /**
     * Returns the objectives text for the current scenario.
     */
    getObjectivesText(): string {
        return this.getObjectivesTextForScenario(this.getCurrentScenario());
    }

    /**
     * Returns the objectives text for a specific scenario.
     */
    getObjectivesTextForScenario(scenario: Scenario): string {
        if (!scenario) return '';
        if (scenario.id === 'mines_freedom') {
            return 'Ziele: 2 Minen befreien, 1 Festung erobern.';
        } else if (scenario.id === 'druid_nights') {
            return 'Ziele: Zerstöre 2 Brutstätten bevor die Zeit abläuft.';
        } else if (scenario.id === 'mining_expedition') {
            return 'Ziele: Befreie 3 Kristallminen.';
        }
        return scenario.description;
    }
}
