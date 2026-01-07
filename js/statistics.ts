// Statistics Tracking for Mage Knight
// Tracks all game statistics for achievements and analytics

import { eventBus } from './eventBus';
import { GAME_EVENTS } from './constants';

export interface GameStats {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    totalPlayTime: number; // in milliseconds

    // Current Game Stats
    turns: number;
    level: number;
    fame: number;
    reputation: number;

    // Combat Stats
    enemiesDefeated: number;
    dragonsDefeated: number;
    perfectCombats: number;
    totalDamageDealt: number;
    totalDamageTaken: number;
    combatsWon: number;
    combatsLost: number;
    combatsStarted: number;

    // Card Stats
    cardsPlayed: number;
    attackCardsPlayed: number;
    blockCardsPlayed: number;
    movementCardsPlayed: number;
    influenceCardsPlayed: number;
    totalCards: number;

    // Mana Stats
    manaUsed: number;
    manaByColor: Record<string, number>;

    // Exploration Stats
    tilesExplored: number;
    sitesVisited: number;
    hexesMoved: number;
    totalMovement: number;

    // Special Stats
    victory: boolean;
    closeCallSurvival: number; // Number of times survived with 1 HP
    wounds: number;
    healed: number;
    restsUsed: number;
}

export class StatisticsManager {
    private stats: GameStats;

    constructor() {
        this.stats = this.createDefaultStats();
        this.load();
        this._setupEventListeners();
    }

    /**
     * Subscribe to game events for automatic tracking
     */
    private _setupEventListeners(): void {
        (eventBus as any).on(GAME_EVENTS.HERO_MOVED, (data: any) => {
            this.trackMovement(data.cost || 1);
        });

        (eventBus as any).on(GAME_EVENTS.COMBAT_ENDED, (data: any) => {
            if (data.victory && data.enemy) {
                this.trackEnemyDefeated(data.enemy);
            }
            this.trackCombat(data.victory, 0);
        });

        (eventBus as any).on(GAME_EVENTS.COMBAT_STARTED, () => {
            this.increment('combatsStarted');
        });
    }

    private createDefaultStats(): GameStats {
        return {
            // Global Stats
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            totalPlayTime: 0,

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
            closeCallSurvival: 0,
            wounds: 0,
            healed: 0,
            restsUsed: 0
        };
    }

    /**
     * Increment a stat
     */
    public increment(statName: keyof GameStats, amount: number = 1): void {
        if (Object.hasOwn(this.stats, statName)) {
            const val = this.stats[statName];
            if (typeof val === 'number') {
                (this.stats as any)[statName] = val + amount;
                this.save();
            }
        }
    }

    /**
     * Set a stat to a specific value
     */
    public set(statName: keyof GameStats, value: any): void {
        if (Object.hasOwn(this.stats, statName)) {
            (this.stats as any)[statName] = value;
            this.save();
        }
    }

    /**
     * Get a stat value
     */
    public get(statName: keyof GameStats): any {
        return this.stats[statName];
    }

    /**
     * Get all stats
     */
    public getAll(): GameStats {
        return { ...this.stats };
    }

    /**
     * Track card played
     */
    public trackCardPlayed(card: any): void {
        this.increment('cardsPlayed');

        // Track by color
        if (card.color) {
            const colorMap: Record<string, keyof GameStats> = {
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
    public trackEnemyDefeated(enemy: any): void {
        this.increment('enemiesDefeated');

        // Track special enemies
        if (enemy.type === 'dragon') {
            this.increment('dragonsDefeated');
        }
    }

    /**
     * Track combat result
     */
    public trackCombat(won: boolean, woundsTaken: number): void {
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
    public trackManaUsed(color: string): void {
        this.increment('manaUsed');

        if (Object.hasOwn(this.stats.manaByColor, color)) {
            this.stats.manaByColor[color]++;
            this.save();
        }
    }

    /**
     * Track exploration
     */
    public trackExploration(): void {
        this.increment('tilesExplored');
    }

    /**
     * Track site visit
     */
    public trackSiteVisit(): void {
        this.increment('sitesVisited');
    }

    /**
     * Track movement
     */
    public trackMovement(distance: number): void {
        this.increment('hexesMoved');
        this.increment('totalMovement', distance);
    }

    /**
     * Track turn
     */
    public trackTurn(): void {
        this.increment('turns');
    }

    /**
     * Track level up
     */
    public trackLevelUp(newLevel: number): void {
        this.set('level', newLevel);
    }

    /**
     * Track game start
     */
    public startGame(): void {
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
    public endGame(victory: boolean): void {
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
    public getSummary(): any {
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
    public getWinRate(): number {
        const total = this.stats.gamesWon + this.stats.gamesLost;
        if (total === 0) return 0;
        return Math.round((this.stats.gamesWon / total) * 100);
    }

    /**
     * Get average turns per game
     */
    public getAverageTurns(): number {
        if (this.stats.gamesPlayed === 0) return 0;
        return Math.round(this.stats.turns / this.stats.gamesPlayed);
    }

    /**
     * Get favorite mana color
     */
    public getFavoriteColor(): string {
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
    public getCombatSuccessRate(): number {
        const total = this.stats.combatsWon + this.stats.combatsLost;
        if (total === 0) return 0;
        return Math.round((this.stats.combatsWon / total) * 100);
    }

    /**
     * Save to localStorage
     */
    public save(): void {
        if (typeof localStorage === 'undefined') return;
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
    public load(): void {
        if (typeof localStorage === 'undefined') return;
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
        }
        // Final safety check: ensure we always have valid stats
        if (!this.stats || typeof this.stats !== 'object') {
            this.stats = this.createDefaultStats();
        }
    }

    /**
     * Reset all statistics
     */
    public reset(): void {
        this.stats = this.createDefaultStats();
        this.save();
    }

    /**
     * Export statistics as JSON
     */
    public export(): string {
        return JSON.stringify(this.stats, null, 2);
    }

    /**
     * Gets state for persistence.
     */
    public getState(): GameStats {
        return { ...this.stats };
    }

    /**
     * Loads state from object.
     */
    public loadState(state: any): void {
        if (!state) return;
        this.stats = { ...this.createDefaultStats(), ...state };
    }
}

export default StatisticsManager;
