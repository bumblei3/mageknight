/**
 * SaveManager handles local storage of game state.
 * Uses Zod schema validation and migration for robust persistence.
 */
import { migrateSave, validateSave, SaveState, CURRENT_SAVE_VERSION } from './SaveSchema';

export class SaveManager {
    /**
     * Saves a serializable state object to localStorage
     * Adds version and timestamp automatically
     */
    static saveGame(slotKey: string | number, state: any): boolean {
        try {
            const key = String(slotKey);
            
            // Add version and timestamp (use provided timestamp or generate new)
            const timestamp = state.timestamp ?? Date.now();
            const versionedState = {
                ...state,
                version: CURRENT_SAVE_VERSION,
                timestamp,
            };
            
            // Validate before saving
            const validation = validateSave(versionedState);
            if (!validation.success) {
                console.error('Save validation failed:', validation.error.issues);
                return false;
            }
            
            const serialized = JSON.stringify(validation.data);
            localStorage.setItem(key, serialized);

            // Update index of saves
            const indexJson = localStorage.getItem('mk_save_index');
            const index = indexJson ? JSON.parse(indexJson) : [];
            if (!index.includes(key)) {
                index.push(key);
                localStorage.setItem('mk_save_index', JSON.stringify(index));
            }

            return true;
        } catch (e) {
            console.error('Failed to save game to localStorage', e);
            return false;
        }
    }

    /**
     * Loads a state object from localStorage
     * Automatically migrates older save versions
     */
    static loadGame(slotKey: string | number): SaveState | null {
        try {
            const key = String(slotKey);
            const serialized = localStorage.getItem(key);
            if (!serialized) return null;
            
            const raw = JSON.parse(serialized);
            
            // Migrate and validate
            const migrated = migrateSave(raw);
            return migrated;
        } catch (e) {
            console.error('Failed to load game from localStorage', e);
            return null;
        }
    }

    /**
     * Deletes a save slot
     */
    static deleteSave(slotKey: string | number): void {
        const key = String(slotKey);
        localStorage.removeItem(key);

        const indexJson = localStorage.getItem('mk_save_index');
        if (indexJson) {
            let index = JSON.parse(indexJson);
            index = index.filter((k: string) => k !== key);
            localStorage.setItem('mk_save_index', JSON.stringify(index));
        }
    }

    /**
     * List all saves
     */
    static listSaves(): string[] {
        const indexJson = localStorage.getItem('mk_save_index');
        return indexJson ? JSON.parse(indexJson) : [];
    }

    /**
     * Checks if a save exists for the given slot
     */
    static hasSave(slotKey: string | number): boolean {
        const saves = this.listSaves();
        return saves.includes(String(slotKey));
    }
}
