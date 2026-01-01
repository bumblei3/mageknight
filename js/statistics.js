// Statistics Tracking for Mage Knight
// Tracks all game statistics for achievements and analytics

import { eventBus } from './eventBus.js';
import { GAME_EVENTS } from './constants.js';
export class StatisticsManager {
    constructor() {
        this.stats = this.createDefaultStats();
        this.load();
        this._setupEventListeners();
    }

    /**
     * Subscribe to game events for automatic tracking
     */
    _setupEventListeners() {
        eventBus.on(GAME_EVENTS.HERO_MOVED, (data) => {
            this.trackMovement(data.cost || 1);
        });

        eventBus.on(GAME_EVENTS.COMBAT_ENDED, (data) => {
            if (data.victory && data.enemy) {
                this.trackEnemyDefeated(data.enemy);
            }
            this.trackCombat(data.victory, 0);
        });

        eventBus.on(GAME_EVENTS.COMBAT_STARTED, () => {
            this.increment('combatsStarted');
        });
    }

    createDefaultStats() {
        return {
            // Global Stats
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            totalPlayTime: 0, // in milliseconds

            // Current Game Stats
            turns: 0,
            level: 1,
            fame: 0,
            reputation: 0,

            // Combat Stats
            enemiesDefeated: 0,
            dragonsDefeated: 0,
            perfectCombats: 0,
            totalDamageDealt: 0,
            totalDamageTaken: 0,
            combatsWon: 0,
            combatsLost: 0,
            combatsStarted: 0,

            // Card Stats
            cardsPlayed: 0,
            attackCardsPlayed: 0,
            blockCardsPlayed: 0,
            movementCardsPlayed: 0,
            influenceCardsPlayed: 0,
            totalCards: 0,

            // Mana Stats
            manaUsed: 0,
            manaByColor: {
                red: 0,
                blue: 0,
                white: 0,
                green: 0,
                gold: 0,
                black: 0
            },

            // Exploration Stats
            tilesExplored: 0,
            sitesVisited: 0,
            hexesMoved: 0,
            totalMovement: 0,

            // Special Stats
            victory: false,
            closeCallSurvival: 0, // Number of times survived with 1 HP
            wounds: 0,
            healed: 0,
            restsUsed: 0
        };
    }

    /**
     * Increment a stat
     */
    increment(statName, amount = 1) {
        if (Object.hasOwn(this.stats, statName)) {
            this.stats[statName] += amount;
            this.save();
        }
    }

    /**
     * Set a stat to a specific value
     */
    set(statName, value) {
        if (Object.hasOwn(this.stats, statName)) {
            this.stats[statName] = value;
            this.save();
        }
    }

    /**
     * Get a stat value
     */
    get(statName) {
        return this.stats[statName];
    }

    /**
     * Get all stats
     */
    getAll() {
        return { ...this.stats };
    }

    /**
     * Track card played
     */
    trackCardPlayed(card) {
        this.increment('cardsPlayed');

        // Track by color
        if (card.color) {
            const colorMap = {
                'red': 'attackCardsPlayed',
                'blue': 'blockCardsPlayed',
                'green': 'movementCardsPlayed',
                'white': 'influenceCardsPlayed'
            };

            const statName = colorMap[card.color];
            if (statName) {
                this.increment(statName);
            }
        }
    }

    /**
     * Track enemy defeated
     */
    trackEnemyDefeated(enemy) {
        this.increment('enemiesDefeated');

        // Track special enemies
        if (enemy.type === 'dragon') {
            this.increment('dragonsDefeated');
        }
    }

    /**
     * Track combat result
     */
    trackCombat(won, woundsTaken) {
        if (won) {
            this.increment('combatsWon');

            // Perfect combat (no wounds)
            if (woundsTaken === 0) {
                this.increment('perfectCombats');
            }
        } else {
            this.increment('combatsLost');
        }
    }

    /**
     * Track mana usage
     */
    trackManaUsed(color) {
        this.increment('manaUsed');

        if (Object.hasOwn(this.stats.manaByColor, color)) {
            this.stats.manaByColor[color]++;
            this.save();
        }
    }

    /**
     * Track exploration
     */
    trackExploration() {
        this.increment('tilesExplored');
    }

    /**
     * Track site visit
     */
    trackSiteVisit() {
        this.increment('sitesVisited');
    }

    /**
     * Track movement
     */
    trackMovement(distance) {
        this.increment('hexesMoved');
        this.increment('totalMovement', distance);
    }

    /**
     * Track turn
     */
    trackTurn() {
        this.increment('turns');
    }

    /**
     * Track level up
     */
    trackLevelUp(newLevel) {
        this.set('level', newLevel);
    }

    /**
     * Track game start
     */
    startGame() {
        // Reset current game stats
        const globalStats = {
            gamesPlayed: this.stats.gamesPlayed,
            gamesWon: this.stats.gamesWon,
            gamesLost: this.stats.gamesLost,
            totalPlayTime: this.stats.totalPlayTime
        };

        this.stats = this.createDefaultStats();

        // Restore global stats
        Object.assign(this.stats, globalStats);

        this.increment('gamesPlayed');
        this.save();
    }

    /**
     * Track game end
     */
    endGame(victory) {
        this.set('victory', victory);

        if (victory) {
            this.increment('gamesWon');
        } else {
            this.increment('gamesLost');
        }

        this.save();
    }

    /**
     * Get summary statistics
     */
    getSummary() {
        return {
            winRate: this.getWinRate(),
            averageTurns: this.getAverageTurns(),
            favoriteColor: this.getFavoriteColor(),
            combatSuccessRate: this.getCombatSuccessRate(),
            explorationProgress: this.stats.tilesExplored,
            achievementProgress: 0 // Will be filled by achievement manager
        };
    }

    /**
     * Calculate win rate
     */
    getWinRate() {
        const total = this.stats.gamesWon + this.stats.gamesLost;
        if (total === 0) return 0;
        return Math.round((this.stats.gamesWon / total) * 100);
    }

    /**
     * Get average turns per game
     */
    getAverageTurns() {
        if (this.stats.gamesPlayed === 0) return 0;
        return Math.round(this.stats.turns / this.stats.gamesPlayed);
    }

    /**
     * Get favorite mana color
     */
    getFavoriteColor() {
        let maxColor = 'none';
        let maxCount = 0;

        Object.entries(this.stats.manaByColor).forEach(([color, count]) => {
            if (count > maxCount) {
                maxCount = count;
                maxColor = color;
            }
        });

        return maxColor;
    }

    /**
     * Calculate combat success rate
     */
    getCombatSuccessRate() {
        const total = this.stats.combatsWon + this.stats.combatsLost;
        if (total === 0) return 0;
        return Math.round((this.stats.combatsWon / total) * 100);
    }

    /**
     * Save to localStorage
     */
    save() {
        try {
            const data = {
                stats: this.stats,
                timestamp: Date.now()
            };
            localStorage.setItem('mageKnight_statistics', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save statistics:', error);
        }
    }

    /**
     * Load from localStorage
     */
    load() {
        try {
            const data = localStorage.getItem('mageKnight_statistics');
            if (data && data.startsWith('{')) {
                const parsed = JSON.parse(data);
                if (parsed && typeof parsed === 'object' && parsed.stats) {
                    this.stats = { ...this.createDefaultStats(), ...parsed.stats };
                }
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
            // Default stats already set in constructor
        }
        // Final safety check: ensure we always have valid stats
        if (!this.stats || typeof this.stats !== 'object') {
            this.stats = this.createDefaultStats();
        }
    }

    /**
     * Reset all statistics
     */
    reset() {
        this.stats = this.createDefaultStats();
        this.save();
    }

    /**
     * Export statistics as JSON
     */
    export() {
        return JSON.stringify(this.stats, null, 2);
    }

    /**
     * Gets state for persistence.
     */
    getState() {
        return { ...this.stats };
    }

    /**
     * Loads state from object.
     */
    loadState(state) {
        if (!state) return;
        this.stats = { ...this.createDefaultStats(), ...state };
    }
}

export default StatisticsManager;
