/**
 * Manages game state persistence: Saving and Loading.
 */
import { SaveManager } from '../persistence/SaveManager';

export class GameStateManager {
    private game: any;

    constructor(game: any) {
        this.game = game;
    }

    /**
     * Saves the current game state to local storage
     * @param {number|string} slotId - Optional slot ID
     */
    saveGame(slotId: number | string): void {
        try {
            const state = this.getGameState();
            const success = SaveManager.saveGame(`slot_${slotId}`, state);
            if (success) {
                const displayId = typeof slotId === 'number' ? slotId + 1 : slotId;
                this.game.showToast(`Spiel in Slot ${displayId} gespeichert`, 'success');
            } else {
                this.game.showToast('Speichern fehlgeschlagen', 'error');
            }
        } catch (e) {
            console.error('Save failed', e);
            this.game.showToast('Speichern fehlgeschlagen', 'error');
        }
    }

    /**
     * Loads game state from a specific slot
     * @param {number|string} slotId
     * @returns {boolean} Success
     */
    loadGame(slotId: number | string): boolean {
        const state = SaveManager.loadGame(`slot_${slotId}`);
        if (state) {
            return this.loadGameState(state);
        }
        return false;
    }

    /**
     * Compiles the full game state object
     * @returns {any}
     */
    getGameState(): any {
        return {
            hero: this.game.hero ? this.game.hero.getState() : null,
            enemies: this.game.entityManager ? this.game.entityManager.enemies.map((e: any) => e.getState()) : [],
            hexGrid: this.game.hexGrid ? this.game.hexGrid.getState() : null,
            time: this.game.timeManager ? this.game.timeManager.getState() : null,
            statistics: this.game.statisticsManager ? this.game.statisticsManager.getState() : null,
            achievements: this.game.achievementManager ? this.game.achievementManager.getState() : null,
            turn: this.game.turnManager ? this.game.turnManager.getState() : null,
            timestamp: Date.now()
        };
    }

    /**
     * Restores game state from an object
     * @param {any} state
     * @returns {boolean}
     */
    loadGameState(state: any): boolean {
        if (!state) return false;

        try {
            // Restore hero
            if (state.hero && this.game.hero) {
                this.game.hero.loadState(state.hero);
            }

            // Restore enemies
            if (state.enemies && this.game.entityManager) {
                this.game.entityManager.enemies = state.enemies.map((eData: any) => {
                    const e = this.game.enemyAI.reconstituteEnemy(eData);
                    return e;
                });
                this.game.enemies = this.game.entityManager.enemies; // Compatibility
            }

            // Restore other systems
            if (state.hexGrid && this.game.hexGrid) this.game.hexGrid.loadState(state.hexGrid);
            if (state.time && this.game.timeManager) this.game.timeManager.loadState(state.time);
            if (state.statistics && this.game.statisticsManager) this.game.statisticsManager.loadState(state.statistics);
            if (state.achievements && this.game.achievementManager) this.game.achievementManager.loadState(state.achievements);
            if (state.turn && this.game.turnManager) this.game.turnManager.loadState(state.turn);

            this.game.updateStats();
            if (this.game.phaseManager) {
                this.game.phaseManager.updateTimeUI();
                this.game.phaseManager.updatePhaseIndicator();
            }
            this.game.render();

            return true;
        } catch (e) {
            console.error('Load failed', e);
            return false;
        }
    }

    /**
     * Opens the save file dialog (Slot-based)
     */
    async openSaveDialog(): Promise<void> {
        if (!this.game.ui || typeof this.game.ui.showSaveLoad !== 'function') return;

        const slot = await this.game.ui.showSaveLoad('save');
        if (slot !== null) {
            this.saveGame(slot);
        }
    }

    /**
     * Opens the load file dialog (Slot-based)
     */
    async openLoadDialog(): Promise<void> {
        if (!this.game.ui || typeof this.game.ui.showSaveLoad !== 'function') return;

        const slot = await this.game.ui.showSaveLoad('load');
        if (slot !== null) {
            const state = SaveManager.loadGame(`slot_${slot}`);
            if (state) {
                this.loadGameState(state);
                this.game.showToast('Spiel geladen!', 'success');
            } else {
                this.game.addLog('Fehler beim Laden', 'info');
                this.game.showToast('Fehler beim Laden', 'error');
            }
        }
    }

    /**
     * Opens the scenario selection dialog
     */
    async openScenarioSelection(): Promise<void> {
        if (this.game.ui && typeof this.game.ui.showScenarioSelection === 'function') {
            await this.game.ui.showScenarioSelection();
        }
    }

    /**
     * Opens the hero selection dialog
     * @param {string} scenarioId - The scenario chosen in the previous step
     */
    async openHeroSelection(scenarioId: string): Promise<void> {
        if (this.game.ui && typeof this.game.ui.showHeroSelection === 'function') {
            await this.game.ui.showHeroSelection(scenarioId);
        }
    }
}
