// Save/Load Manager for Mage Knight

export class SaveManager {
    constructor() {
        this.storageKey = 'mageknight_saves';
        this.autoSaveKey = 'mageknight_autosave';
        this.maxSlots = 5;
    }

    /**
     * Save game to a specific slot
     * @param {number} slotId - Slot number (0-4)
     * @param {object} gameState - Complete game state
     * @returns {boolean} Success
     */
    saveGame(slotId, gameState) {
        try {
            const saves = this.getAllSaves();

            const saveData = {
                version: '1.0',
                timestamp: Date.now(),
                slotId: slotId,
                state: this.serializeGameState(gameState)
            };

            saves[slotId] = saveData;
            localStorage.setItem(this.storageKey, JSON.stringify(saves));

            console.log(`Game saved to slot ${slotId}`);
            return true;
        } catch (error) {
            console.error('Error saving game:', error);
            return false;
        }
    }

    /**
     * Save alias for generic calls (auto-save or default slot)
     */
    save(gameState) {
        // Default to auto-save if no slot provided, or specific logic
        // But GameStateManager.js calls this.game.saveManager.save(state)
        // It seems it expects a simple save. Let's redirect to autoSave or a default slot 0.
        // Given the error in tests was during "saveGame" flow which might imply manual save but called generically?
        // Let's assume it acts as autoSave or save to current slot if we tracked it.
        // Safer: Call autoSave.
        this.saveGame(0, gameState); // Default to slot 0 for now as 'quick save'
    }

    /**
     * Load game from a specific slot
     * @param {number} slotId - Slot number (0-4)
     * @returns {object|null} Game state or null
     */
    loadGame(slotId) {
        try {
            const saves = this.getAllSaves();
            const saveData = saves[slotId];

            if (!saveData) {
                console.warn(`No save found in slot ${slotId}`);
                return null;
            }

            // Validate version
            if (saveData.version !== '1.0') {
                console.warn('Save version mismatch');
            }

            return this.deserializeGameState(saveData.state);
        } catch (error) {
            console.error('Error loading game:', error);
            return null;
        }
    }

    /**
     * Auto-save the current game state
     * @param {object} gameState - Complete game state
     */
    autoSave(gameState) {
        try {
            const saveData = {
                version: '1.0',
                timestamp: Date.now(),
                state: this.serializeGameState(gameState)
            };

            localStorage.setItem(this.autoSaveKey, JSON.stringify(saveData));
        } catch (error) {
            console.error('Error auto-saving:', error);
        }
    }

    /**
     * Load auto-saved game
     * @returns {object|null} Game state or null
     */
    loadAutoSave() {
        try {
            const data = localStorage.getItem(this.autoSaveKey);
            if (!data) return null;

            const saveData = JSON.parse(data);
            return this.deserializeGameState(saveData.state);
        } catch (error) {
            console.error('Error loading auto-save:', error);
            return null;
        }
    }

    /**
     * Get all saves
     * @returns {object} All save slots
     */
    getAllSaves() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error reading saves:', error);
            return {};
        }
    }

    /**
     * List all save slots with metadata
     * @returns {Array} Array of save metadata
     */
    listSaves() {
        const saves = this.getAllSaves();
        const saveList = [];

        for (let i = 0; i < this.maxSlots; i++) {
            if (saves[i]) {
                saveList.push({
                    slotId: i,
                    timestamp: saves[i].timestamp,
                    date: new Date(saves[i].timestamp).toLocaleString('de-DE'),
                    turn: saves[i].state.turn || 0,
                    heroName: saves[i].state.hero?.name || 'Unknown',
                    fame: saves[i].state.hero?.fame || 0
                });
            } else {
                saveList.push({
                    slotId: i,
                    empty: true
                });
            }
        }

        return saveList;
    }

    /**
     * Delete a save slot
     * @param {number} slotId - Slot number to delete
     */
    deleteSave(slotId) {
        try {
            const saves = this.getAllSaves();
            delete saves[slotId];
            localStorage.setItem(this.storageKey, JSON.stringify(saves));
            console.log(`Deleted save in slot ${slotId}`);
            return true;
        } catch (error) {
            console.error('Error deleting save:', error);
            return false;
        }
    }

    /**
     * Serialize game state for storage
     * @param {object} gameState - Complete game state
     * @returns {object} Serialized state
     */
    serializeGameState(gameState) {
        return {
            turn: gameState.turn || 0,
            hero: {
                name: gameState.hero.name,
                position: gameState.hero.position,
                level: gameState.hero.level,
                armor: gameState.hero.armor,
                handLimit: gameState.hero.handLimit,
                fame: gameState.hero.fame,
                reputation: gameState.hero.reputation,
                deck: gameState.hero.deck,
                hand: gameState.hero.hand,
                discard: gameState.hero.discard,
                wounds: gameState.hero.wounds,
                crystals: gameState.hero.crystals,
                movementPoints: gameState.hero.movementPoints,
                attackPoints: gameState.hero.attackPoints,
                blockPoints: gameState.hero.blockPoints,
                influencePoints: gameState.hero.influencePoints,
                healingPoints: gameState.hero.healingPoints
            },
            enemies: (gameState.enemies || []).map(enemy => ({
                type: enemy.type,
                position: enemy.position,
                armor: enemy.armor,
                attack: enemy.attack,
                fame: enemy.fame,
                fortified: enemy.fortified,
                isAlive: enemy.isAlive
            })),
            manaSource: {
                dice: (gameState.manaSource && gameState.manaSource.dice) || []
            },
            terrain: gameState.terrain || {},
            selectedHex: gameState.selectedHex || null,
            movementMode: gameState.movementMode || false
        };
    }

    /**
     * Deserialize game state from storage
     * @param {object} serializedState - Serialized game state
     * @returns {object} Deserialized state
     */
    deserializeGameState(serializedState) {
        // Return the state as-is, game.js will handle reconstruction
        return serializedState;
    }

    /**
     * Check if auto-save exists
     * @returns {boolean} True if auto-save exists
     */
    hasAutoSave() {
        return !!localStorage.getItem(this.autoSaveKey);
    }

    /**
     * Clear all saves (for testing/reset)
     */
    clearAllSaves() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.autoSaveKey);
        console.log('All saves cleared');
    }
}

export default SaveManager;
