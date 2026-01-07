/**
 * ShortcutManager
 * Handles keyboard shortcuts storage, retrieval, and resolution.
 */
export class ShortcutManager {
    constructor() {
        this.defaultBindings = {
            'END_TURN': { key: ' ', label: 'Zug beenden' },
            'REST': { key: 'r', label: 'Ausruhen' },
            'EXPLORE': { key: 'e', label: 'Erkunden' },
            'TUTORIAL': { key: 't', label: 'Tutorial' },
            'HELP': { key: 'h', label: 'Hilfe' },
            'CANCEL': { key: 'Escape', label: 'Abbrechen' },
            'MANA_PANEL': { key: 'm', label: 'Mana anzeigen' }
        };

        this.bindings = this.loadBindings();
    }

    loadBindings() {
        try {
            const stored = localStorage.getItem('mk_shortcuts');
            if (stored) {
                // Merge stored with defaults to ensure all actions exist
                // Users might have old config, so we only override keys
                const parsed = JSON.parse(stored);
                const combined = { ...this.defaultBindings };

                Object.keys(parsed).forEach(action => {
                    if (combined[action]) {
                        combined[action].key = parsed[action];
                    }
                });
                return combined;
            }
        } catch (e) {
            console.error('Failed to load shortcuts', e);
        }
        return { ...this.defaultBindings };
    }

    saveBindings() {
        try {
            const toSave = {};
            Object.keys(this.bindings).forEach(action => {
                toSave[action] = this.bindings[action].key;
            });
            localStorage.setItem('mk_shortcuts', JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save shortcuts', e);
        }
    }

    /**
     * Get the action ID for a given key event
     * @param {KeyboardEvent} event 
     * @returns {string|null} Action ID or null
     */
    getAction(event) {
        // We only handle simple keys here for customizable actions.
        // Complex modifier combos might be hardcoded in InputController for now (Ctrl+S etc)
        // or we can extend this to support modifiers.

        const key = event.key;

        for (const [action, binding] of Object.entries(this.bindings)) {
            // Check for match (case insensitive for single letters)
            if (binding.key.toLowerCase() === key.toLowerCase()) {
                return action;
            }

            // Special case for Space
            if (binding.key === ' ' && (key === ' ' || key === 'Spacebar')) {
                return action;
            }
        }
        return null;
    }

    updateBinding(action, newKey) {
        if (this.bindings[action]) {
            this.bindings[action].key = newKey;
            this.saveBindings();
            return true;
        }
        return false;
    }

    resetDefaults() {
        this.bindings = { ...this.defaultBindings };
        this.saveBindings();
    }
}
