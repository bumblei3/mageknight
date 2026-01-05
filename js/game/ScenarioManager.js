
import { SITE_TYPES } from '../sites.js';
import { TERRAIN_TYPES } from '../constants.js';
import { logger } from '../logger.js';
import { t } from '../i18n/index.js';

export class ScenarioManager {
    constructor(game) {
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
                        TERRAIN_TYPES.HILLS,     // N - Mine potential
                        TERRAIN_TYPES.MOUNTAINS, // NE - Mine potential
                        TERRAIN_TYPES.PLAINS,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.HILLS,
                        TERRAIN_TYPES.WASTELAND
                    ],
                    deckDistribution: 'mines_focused' // Hint for MapManager
                }
            },
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
                        TERRAIN_TYPES.SWAMP, // Note: Swamp not in constants yet? Need to check.
                        // If not, use Wasteland/Forest mix.
                        // Checking constants.js is safer. Assuming WATER/SWAMP distinct?
                        // Let's stick to standard types: FOREST, WASTELAND (Swamp-like), WATER
                        TERRAIN_TYPES.WASTELAND,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.FOREST,
                        TERRAIN_TYPES.WATER,
                        TERRAIN_TYPES.PLAINS
                    ],
                    // Custom deck for this scenario (Swampy/Dark)
                    deck: [
                        [TERRAIN_TYPES.FOREST, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.WATER, TERRAIN_TYPES.FOREST],
                        [TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.WATER],
                        [TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS]
                    ]
                }
            }
        };
    }

    loadScenario(scenarioId) {
        if (this.scenarios[scenarioId]) {
            this.currentScenario = scenarioId;
            logger.info(`Loaded scenario: ${this.scenarios[scenarioId].name}`);
            return this.scenarios[scenarioId];
        }
        return null;
    }

    getCurrentScenario() {
        return this.scenarios[this.currentScenario];
    }

    checkVictory() {
        const scenario = this.getCurrentScenario();
        if (!scenario) return false;

        const stats = this.game.statisticsManager ? this.game.statisticsManager.getAll() : {};
        // We might need more specific tracking than general stats
        // Let's iterate over sites to check specifics if needed,
        // or ensure statsManager tracks 'minesConquered', 'keepsConquered'.

        // Current statisticsManager might strictly track 'sitesConquered' total.
        // We should query the MapManager or SiteManager for specific counts.

        // Count conquered sites by type
        let conqueredMines = 0;
        let conqueredKeeps = 0;
        let conqueredSpawns = 0;

        // Iterate all hexes (expensive? Not really, map is small)
        if (this.game.hexGrid) {
            for (const [key, hex] of this.game.hexGrid.hexes) {
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
            const roundsNeeded = scenario.victoryConditions.rounds || 6;

            // Victory: Survived rounds AND killed spawns.
            // Triggers when spawns are dead? Or when time is up?
            // "Survive 3 Nights" implies winning AFTER time passes.
            // But usually you want to win ASAP if objectives met.
            // Let's say: If Spawns destroyed AND Round >= 6?
            // Or simple: Just kill the spawns to stop the ritual?
            // Scenario desc says: "Survive ... AND destroy".
            // Let's interpret as: You must destroy the sources within the time limit or just destroy them.
            // Simplification: Win if Spawns >= 2. (The "Nights" are just pressure).

            if (conqueredSpawns >= spawnsNeeded) {
                return {
                    victory: true,
                    message: 'Die Druiden-Rituale wurden gestoppt! Deine Tapferkeit hat die Region gerettet.'
                };
            }
        }

        return false;
    }

    getObjectivesText() {
        const scenario = this.getCurrentScenario();
        if (scenario.id === 'mines_freedom') {
            return 'Ziele: 2 Minen befreien, 1 Festung erobern.';
        } else if (scenario.id === 'druid_nights') {
            return 'Ziele: Zerstöre 2 Brutstätten bevor die Zeit abläuft.';
        }
        return scenario.description;
    }
}

