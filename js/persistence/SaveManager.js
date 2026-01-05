export class SaveManager {
    static STORAGE_KEY_PREFIX = 'mageknight_save_';

    /**
     * Save the game state to local storage.
     * @param {string} slotId - The slot identifier (e.g., 'auto', 'slot1').
     * @param {Object} gameState - The serialized game state object.
     * @returns {boolean} True if successful, false otherwise.
     */
    static saveGame(slotId, gameState) {
        try {
            const key = `${this.STORAGE_KEY_PREFIX}${slotId}`;
            const data = JSON.stringify({
                timestamp: Date.now(),
                version: '1.0',
                state: gameState
            });
            localStorage.setItem(key, data);
            console.log(`[SaveManager] Game saved to slot: ${slotId}`);
            return true;
        } catch (e) {
            console.error('[SaveManager] Failed to save game:', e);
            return false;
        }
    }

    /**
     * Load a game state from local storage.
     * @param {string} slotId - The slot identifier.
     * @returns {Object|null} The game state object or null if not found/error.
     */
    static loadGame(slotId) {
        try {
            const key = `${this.STORAGE_KEY_PREFIX}${slotId}`;
            const data = localStorage.getItem(key);
            if (!data) return null;

            const parsed = JSON.parse(data);
            console.log(`[SaveManager] Game loaded from slot: ${slotId}`);
            // Return the inner state object
            return parsed.state;
        } catch (e) {
            console.error('[SaveManager] Failed to load game:', e);
            return null;
        }
    }

    /**
     * Check if a save slot exists.
     * @param {string} slotId 
     * @returns {boolean}
     */
    static hasSave(slotId) {
        return !!localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${slotId}`);
    }

    /**
     * Get metadata for a save slot (timestamp, etc.)
     * @param {string} slotId 
     */
    static getSaveMeta(slotId) {
        try {
            const key = `${this.STORAGE_KEY_PREFIX}${slotId}`;
            const data = localStorage.getItem(key);
            if (!data) return null;
            const parsed = JSON.parse(data);
            return {
                timestamp: parsed.timestamp,
                version: parsed.version
            };
        } catch (e) {
            return null;
        }
    }
}
