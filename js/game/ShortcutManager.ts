/**
 * Interface for a shortcut binding.
 */
export interface ShortcutBinding {
    key: string;
    label: string;
}

/**
 * Handles keyboard shortcuts storage, retrieval, and resolution.
 */
export class ShortcutManager {
    private defaultBindings: Record<string, ShortcutBinding>;
    private bindings: Record<string, ShortcutBinding>;

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

    /**
     * Loads bindings from local storage or defaults.
     */
    private loadBindings(): Record<string, ShortcutBinding> {
        try {
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem('mk_shortcuts');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    const combined = JSON.parse(JSON.stringify(this.defaultBindings));

                    Object.keys(parsed).forEach(action => {
                        if (combined[action]) {
                            combined[action].key = parsed[action];
                        }
                    });
                    return combined;
                }
            }
        } catch (e) {
            console.error('Failed to load shortcuts', e);
        }
        return JSON.parse(JSON.stringify(this.defaultBindings));
    }

    /**
     * Saves current bindings to local storage.
     */
    saveBindings(): void {
        try {
            if (typeof localStorage !== 'undefined') {
                const toSave: Record<string, string> = {};
                Object.keys(this.bindings).forEach(action => {
                    toSave[action] = this.bindings[action].key;
                });
                localStorage.setItem('mk_shortcuts', JSON.stringify(toSave));
            }
        } catch (e) {
            console.error('Failed to save shortcuts', e);
        }
    }

    /**
     * Get the action ID for a given key event.
     */
    getAction(event: KeyboardEvent): string | null {
        const key = event.key;

        for (const [action, binding] of Object.entries(this.bindings)) {
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

    /**
     * Updates a binding for a specific action.
     */
    updateBinding(action: string, newKey: string): boolean {
        if (this.bindings[action]) {
            this.bindings[action].key = newKey;
            this.saveBindings();
            return true;
        }
        return false;
    }

    /**
     * Resets all bindings to their default values.
     */
    resetDefaults(): void {
        this.bindings = JSON.parse(JSON.stringify(this.defaultBindings));
        this.saveBindings();
    }
}
