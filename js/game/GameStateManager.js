/**
 * Manages game state persistence: Saving and Loading.
 */
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
            if (slotId !== undefined) {
                this.game.saveManager.saveGame(slotId, state);
                this.game.showToast(`Spiel in Slot ${slotId + 1} gespeichert`, 'success');
            } else {
                this.game.saveManager.save(state);
                this.game.showToast('Spiel gespeichert', 'success');
            }
        } catch (e) {
            console.error('Save failed', e);
            this.game.showToast('Speichern fehlgeschlagen', 'error');
        }
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
    openSaveDialog() {
        const saves = this.game.saveManager.listSaves();
        let message = '💾 SPIEL SPEICHERN\n\nWähle einen Slot (1-5):\n';

        saves.forEach(save => {
            if (save.empty) {
                message += `Slot ${save.slotId + 1}: [Leer]\n`;
            } else {
                message += `Slot ${save.slotId + 1}: ${save.heroName} - Zug ${save.turn} - ${save.date}\n`;
            }
        });

        const slot = prompt(message);
        if (slot && slot >= 1 && slot <= 5) {
            const state = this.getGameState();
            // Fix: calls saveGame(slotId, state) on SaveManager which expects (slotId, state)
            // Previous code: saveGame(state, slotId) -> Wrong!
            this.game.saveManager.saveGame(parseInt(slot) - 1, state);
            this.game.showToast(`Spiel in Slot ${slot} gespeichert!`, 'success');
        }
    }

    /**
     * Opens the load file dialog (Slot-based)
     */
    openLoadDialog() {
        const saves = this.game.saveManager.listSaves();
        let message = '📂 SPIELSTAND LADEN\n\n';

        saves.forEach(save => {
            if (save.empty) {
                message += `Slot ${save.slotId + 1}: [Leer]\n`;
            } else {
                message += `Slot ${save.slotId + 1}: ${save.heroName} - Zug ${save.turn} - ${save.date} \n`;
            }
        });

        message += '\nWähle Slot (1-5) oder Abbrechen:';
        const slot = prompt(message);

        if (slot && slot >= 1 && slot <= 5) {
            const state = this.game.saveManager.loadGame(parseInt(slot) - 1);
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
