/**
 * Manages game state persistence: Saving and Loading.
 */
import { SaveManager } from '../persistence/SaveManager.js';

export class GameStateManager {
    constructor(game) {
        this.game = game;
    }

    /**
     * Saves the current game state to local storage
     */
    /**
     * Saves the current game state to local storage
     * @param {number} slotId - Optional slot ID
     */
    saveGame(slotId) {
        try {
            const state = this.getGameState();
            // Slot ID logic: 0-4 for manual usage?
            // The new SaveManager treats slotId as string suffix effectively.
            // Let's assume UI passes 0-based index.
            const success = SaveManager.saveGame(`slot_${slotId}`, state);
            if (success) {
                this.game.showToast(`Spiel in Slot ${slotId + 1} gespeichert`, 'success');
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
    loadGame(slotId) {
        const state = SaveManager.loadGame(`slot_${slotId}`);
        if (state) {
            return this.loadGameState(state);
        }
        return false;
    }

    /**
     * Compiles the full game state object
     * @returns {Object}
     */
    getGameState() {
        return {
            hero: this.game.hero ? this.game.hero.getState() : null,
            enemies: this.game.entityManager.enemies.map(e => e.getState()),
            hexGrid: this.game.hexGrid.getState(),
            time: this.game.timeManager.getState(),
            statistics: this.game.statisticsManager.getState(),
            achievements: this.game.achievementManager.getState(),
            turn: this.game.turnManager.getState(),
            timestamp: Date.now()
        };
    }

    /**
     * Restores game state from an object
     * @param {Object} state
     */
    loadGameState(state) {
        if (!state) return false;

        try {
            // Restore hero
            if (state.hero && this.game.hero) {
                this.game.hero.loadState(state.hero);
            }

            // Restore enemies
            if (state.enemies) {
                this.game.entityManager.enemies = state.enemies.map(eData => {
                    const e = this.game.enemyAI.reconstituteEnemy(eData);
                    return e;
                });
                this.game.enemies = this.game.entityManager.enemies; // Compatibility
            }

            // Restore other systems
            if (state.hexGrid) this.game.hexGrid.loadState(state.hexGrid);
            if (state.time) this.game.timeManager.loadState(state.time);
            if (state.statistics) this.game.statisticsManager.loadState(state.statistics);
            if (state.achievements) this.game.achievementManager.loadState(state.achievements);
            if (state.turn) this.game.turnManager.loadState(state.turn);

            this.game.updateStats();
            this.game.updateTimeUI();
            this.game.updatePhaseIndicator();
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
    async openSaveDialog() {
        if (!this.game.ui || !this.game.ui.saveLoadModal) return;

        const slot = await this.game.ui.saveLoadModal.show('save');
        if (slot !== null) {
            this.saveGame(slot);
        }
    }

    /**
     * Opens the load file dialog (Slot-based)
     */
    async openLoadDialog() {
        if (!this.game.ui || !this.game.ui.saveLoadModal) return;

        const slot = await this.game.ui.saveLoadModal.show('load');
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
}
