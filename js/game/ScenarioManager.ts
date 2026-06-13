import { SITE_TYPES } from '../sites';
import { TERRAIN_TYPES, TerrainType } from '../constants';
import { logger } from '../logger';
import { MINING_EXPEDITION } from '../scenarios/MiningExpedition';
import { SitePlacement } from '../mapManager';

/**
 * Interface for scenario victory conditions.
 */
export interface VictoryConditions {
    mines?: number;
    keeps?: number;
    spawning_grounds?: number;
    rounds?: number;
    boss?: string;
    [key: string]: number | string | undefined;
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
        sitePlacements?: SitePlacement[];
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
                    deckDistribution: 'mines_focused',
                    sitePlacements: [
                        { type: SITE_TYPES.MINE, q: 2, r: -2, count: 2, radius: 3 },
                        { type: SITE_TYPES.KEEP, q: -2, r: 2, count: 1, radius: 2 }
                    ]
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
                    ],
                    sitePlacements: [
                        { type: SITE_TYPES.SPAWNING_GROUNDS, q: 3, r: -1, count: 2, radius: 3 }
                    ]
                }
            },
            'dungeon_lords': {
                id: 'dungeon_lords',
                name: 'Dungeon Lords',
                description: 'Mächtige Dungeon-Lords haben sich in den Tiefen verschanzt. Erobere 2 Dungeons, 1 Gruft, 1 Ruine und 1 Labyrinth, um ihre Herrschaft zu brechen.',
                victoryConditions: {
                    dungeon: 2,
                    tomb: 1,
                    ruins: 1,
                    labyrinth: 1
                },
                mapConfig: {
                    startTile: [
                        TERRAIN_TYPES.PLAINS,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.HILLS,
                        TERRAIN_TYPES.MOUNTAINS,
                        TERRAIN_TYPES.WASTELAND,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.HILLS
                    ],
                    deckDistribution: 'dungeon_focused',
                    sitePlacements: [
                        { type: SITE_TYPES.DUNGEON, q: 2, r: -2, count: 2, radius: 3 },
                        { type: SITE_TYPES.TOMB, q: -2, r: 2, count: 1, radius: 2 },
                        { type: SITE_TYPES.RUINS, q: 0, r: 3, count: 1, radius: 2 },
                        { type: SITE_TYPES.LABYRINTH, q: -2, r: -2, count: 1, radius: 2 }
                    ]
                }
            },
            'labyrinth_rising': {
                id: 'labyrinth_rising',
                name: 'Labyrinth Rising',
                description: 'Ein uraltes Labyrinth ist erwacht und speit Monster aus. Durchquere 3 Labyrinthe, bevor die Zeit abläuft.',
                victoryConditions: {
                    labyrinth: 3,
                    rounds: 8
                },
                mapConfig: {
                    startTile: [
                        TERRAIN_TYPES.HILLS,
                        TERRAIN_TYPES.MOUNTAINS,
                        TERRAIN_TYPES.WASTELAND,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.HILLS,
                        TERRAIN_TYPES.MOUNTAINS,
                        TERRAIN_TYPES.WASTELAND
                    ],
                    deckDistribution: 'dungeon_focused',
                    sitePlacements: [
                        { type: SITE_TYPES.LABYRINTH, q: 2, r: -1, count: 3, radius: 4 }
                    ]
                }
            },
            'volkare_quest': {
                id: 'volkare_quest',
                name: "Volkare's Quest",
                description: "Volkare zieht mit seiner Armee auf die Stadt zu. Besiege Volkare, bevor er das Portal erreicht, oder erobere 2 Festungen, um seine Versorgungslinien zu kappen.",
                victoryConditions: {
                    boss: 'volkare',
                    keeps: 2
                },
                mapConfig: {
                    startTile: [
                        TERRAIN_TYPES.PLAINS,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.HILLS,
                        TERRAIN_TYPES.MOUNTAINS,
                        TERRAIN_TYPES.PLAINS,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.HILLS
                    ],
                    deckDistribution: 'dungeon_focused',
                    sitePlacements: [
                        { type: SITE_TYPES.KEEP, q: 2, r: -2, count: 2, radius: 3 },
                        { type: SITE_TYPES.CITY, q: -2, r: 2, count: 1, radius: 2 },
                        { type: SITE_TYPES.MAGE_TOWER, q: 0, r: -3, count: 1, radius: 2 }
                    ]
                }
            },
            'volkare_return': {
                id: 'volkare_return',
                name: "Volkare's Return",
                description: "Volkare ist zurückgekehrt, mächtiger als je zuvor. Besiege ihn in seinem Lager, während du seine Generäle ausschaltest.",
                victoryConditions: {
                    boss: 'volkare',
                    spawning_grounds: 2
                },
                mapConfig: {
                    startTile: [
                        TERRAIN_TYPES.WASTELAND,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.HILLS,
                        TERRAIN_TYPES.MOUNTAINS,
                        TERRAIN_TYPES.WASTELAND,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.PLAINS
                    ],
                    deckDistribution: 'dungeon_focused',
                    sitePlacements: [
                        { type: SITE_TYPES.SPAWNING_GROUNDS, q: 3, r: -1, count: 2, radius: 3 },
                        { type: SITE_TYPES.DUNGEON, q: -2, r: 2, count: 1, radius: 2 },
                        { type: SITE_TYPES.KEEP, q: 2, r: 2, count: 1, radius: 2 }
                    ]
                }
            },
            'volkare_legacy': {
                id: 'volkare_legacy',
                name: "Volkare's Legacy",
                description: "Volkares dunkles Vermächtnis lastet auf dem Land. Reinige 3 Brutstätten und besiege seinen Avatar im finalen Kampf.",
                victoryConditions: {
                    spawning_grounds: 3,
                    boss: 'volkare'
                },
                mapConfig: {
                    startTile: [
                        TERRAIN_TYPES.WASTELAND,
                        TERRAIN_TYPES.WASTELAND,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.MOUNTAINS,
                        TERRAIN_TYPES.HILLS,
                        TERRAIN_TYPES.WASTELAND,
                        TERRAIN_TYPES.PLAINS
                    ],
                    deckDistribution: 'dungeon_focused',
                    sitePlacements: [
                        { type: SITE_TYPES.SPAWNING_GROUNDS, q: 2, r: -2, count: 3, radius: 4 },
                        { type: SITE_TYPES.TOMB, q: -2, r: 2, count: 1, radius: 2 },
                        { type: SITE_TYPES.CITY, q: 0, r: 3, count: 1, radius: 2 }
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
        let conqueredDungeons = 0;
        let conqueredTombs = 0;
        let conqueredRuins = 0;
        let conqueredLabyrinths = 0;

        // Iterate all hexes
        if (this.game.hexGrid && this.game.hexGrid.hexes) {
            for (const hex of this.game.hexGrid.hexes.values()) {
                if (hex.site && hex.site.conquered) {
                    if (hex.site.type === SITE_TYPES.MINE) conqueredMines++;
                    if (hex.site.type === SITE_TYPES.KEEP) conqueredKeeps++;
                    if (hex.site.type === SITE_TYPES.SPAWNING_GROUNDS) conqueredSpawns++;
                    if (hex.site.type === SITE_TYPES.DUNGEON) conqueredDungeons++;
                    if (hex.site.type === SITE_TYPES.TOMB) conqueredTombs++;
                    if (hex.site.type === 'ruins' || hex.site.type === SITE_TYPES.RUINS) conqueredRuins++;
                    if (hex.site.type === SITE_TYPES.LABYRINTH) conqueredLabyrinths++;
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
            const minesNeeded = (scenario.victoryConditions.mines as number) || 0;
            if (conqueredMines >= minesNeeded) {
                return {
                    victory: true,
                    message: 'Mission erfüllt! Die Minen sind gesichert.'
                };
            }
        } else if (scenario.id === 'dungeon_lords') {
            const dungeonsNeeded = (scenario.victoryConditions.dungeon as number) || 0;
            const tombsNeeded = (scenario.victoryConditions.tomb as number) || 0;
            const ruinsNeeded = (scenario.victoryConditions.ruins as number) || 0;
            const labyrinthsNeeded = (scenario.victoryConditions.labyrinth as number) || 0;

            if (conqueredDungeons >= dungeonsNeeded && conqueredTombs >= tombsNeeded && conqueredRuins >= ruinsNeeded && conqueredLabyrinths >= labyrinthsNeeded) {
                return {
                    victory: true,
                    message: `${scenario.name} erfolgreich abgeschlossen! Die Dungeon-Lords sind besiegt.`
                };
            }
        } else if (scenario.id === 'labyrinth_rising') {
            const labyrinthsNeeded = (scenario.victoryConditions.labyrinth as number) || 0;
            const roundsNeeded = (scenario.victoryConditions.rounds as number) || 0;
            const currentRound = this.game.round || 0;
            
            if (conqueredLabyrinths >= labyrinthsNeeded) {
                return {
                    victory: true,
                    message: `${scenario.name} erfolgreich abgeschlossen! Die Labyrinthe sind durchquert.`
                };
            }
            
            if (currentRound > roundsNeeded) {
                return {
                    victory: false,
                    message: `Zeit abgelaufen! Die Labyrinthe haben dich überwältigt.`
                };
            }
        } else if (scenario.id === 'volkare_quest') {
            const keepsNeeded = (scenario.victoryConditions.keeps as number) || 0;
            const bossDefeated = this.checkBossDefeated('volkare');
            
            if (bossDefeated || conqueredKeeps >= keepsNeeded) {
                return {
                    victory: true,
                    message: `${scenario.name} erfolgreich abgeschlossen! Volkares Vormarsch wurde gestoppt.`
                };
            }
        } else if (scenario.id === 'volkare_return') {
            const spawnsNeeded = (scenario.victoryConditions.spawning_grounds as number) || 0;
            const bossDefeated = this.checkBossDefeated('volkare');
            
            if (bossDefeated || conqueredSpawns >= spawnsNeeded) {
                return {
                    victory: true,
                    message: `${scenario.name} erfolgreich abgeschlossen! Volkares Rückkehr wurde abgewehrt.`
                };
            }
        } else if (scenario.id === 'volkare_legacy') {
            const spawnsNeeded = (scenario.victoryConditions.spawning_grounds as number) || 0;
            const bossDefeated = this.checkBossDefeated('volkare');
            
            if (bossDefeated || conqueredSpawns >= spawnsNeeded) {
                return {
                    victory: true,
                    message: `${scenario.name} erfolgreich abgeschlossen! Volkares Vermächtnis ist gebrochen.`
                };
            }
        }

        return false;
    }

    /**
     * Checks if a boss enemy has been defeated.
     */
    private checkBossDefeated(bossType: string): boolean {
        if (this.game.hexGrid && this.game.hexGrid.hexes) {
            for (const hex of this.game.hexGrid.hexes.values()) {
                if (hex.enemy && hex.enemy.type === bossType && hex.enemy.isBoss) {
                    return false; // Boss still alive
                }
            }
        }
        // Also check game's enemy list
        if (this.game.enemies) {
            for (const enemy of this.game.enemies) {
                if (enemy.type === bossType && enemy.isBoss) {
                    return false; // Boss still alive
                }
            }
        }
        return true; // No boss found = defeated
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
        } else if (scenario.id === 'dungeon_lords') {
            return 'Ziele: 2 Dungeons, 1 Gruft, 1 Ruine und 1 Labyrinth erobern.';
        } else if (scenario.id === 'labyrinth_rising') {
            return 'Ziele: 3 Labyrinthe durchqueren in 8 Runden.';
        } else if (scenario.id === 'volkare_quest') {
            return 'Ziele: Besiege Volkare ODER erobere 2 Festungen.';
        } else if (scenario.id === 'volkare_return') {
            return 'Ziele: Besiege Volkare ODER zerstöre 2 Brutstätten.';
        } else if (scenario.id === 'volkare_legacy') {
            return 'Ziele: Zerstöre 3 Brutstätten UND besiege Volkare.';
        }
        return scenario.description;
    }
}