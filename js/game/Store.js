/**
 * Centralized State Management for Mage Knight
 * Provides a single source of truth and reactive updates for UI components.
 */
export const ACTIONS = {
    // Hero Actions
    SET_HERO_STATS: 'SET_HERO_STATS',
    SET_HERO_RESOURCES: 'SET_HERO_RESOURCES',
    SET_HERO_INVENTORY: 'SET_HERO_INVENTORY',

    // Game State Actions
    SET_GAME_PHASE: 'SET_GAME_PHASE',
    SET_GAME_ROUND: 'SET_GAME_ROUND',
    SET_DAY_NIGHT: 'SET_DAY_NIGHT',

    // Combat Actions
    SET_COMBAT_STATE: 'SET_COMBAT_STATE',

    // UI Actions
    SET_LOADING: 'SET_LOADING',
    SET_LANGUAGE: 'SET_LANGUAGE'
};

class Store {
    constructor() {
        this.listeners = new Set();
        this.reset();
    }

    /**
     * Resets the store to initial state
     */
    reset() {
        this.state = {
            hero: {
                name: '',
                level: 1,
                fame: 0,
                reputation: 0,
                armor: 2,
                handLimit: 5,
                commandLimit: 1,
                movementPoints: 0,
                attackPoints: 0,
                blockPoints: 0,
                influencePoints: 0,
                healingPoints: 0,
                crystals: {},
                tempMana: [],
                deckSize: 0,
                handSize: 0,
                discardSize: 0,
                wounds: 0,
                units: [],
                skills: [],
                usedSkills: []
            },
            game: {
                phase: 'EXPLORATION',
                round: 1,
                isNight: false,
                scenario: 'default'
            },
            combat: {
                active: false,
                phase: 'NONE',
                enemies: [],
                defeated: [],
                totalDamage: 0
            },
            ui: {
                loading: false,
                activeModal: null,
                language: 'de'
            }
        };
        this.notify();
    }

    /**
     * Clears all listeners (useful for testing)
     */
    clearListeners() {
        this.listeners.clear();
    }

    /**
     * Subscribe to state changes
     * @param {Function} callback - Function called with (state, action)
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Dispatches an action to update state
     * @param {string} action - Action type from ACTIONS
     * @param {Object} payload - Data to update
     */
    dispatch(action, payload) {
        let stateChanged = false;

        switch (action) {
        case ACTIONS.SET_HERO_STATS:
            this.state.hero = { ...this.state.hero, ...payload };
            stateChanged = true;
            break;
        case ACTIONS.SET_HERO_RESOURCES:
            this.state.hero = { ...this.state.hero, ...payload };
            stateChanged = true;
            break;
        case ACTIONS.SET_HERO_INVENTORY:
            this.state.hero = { ...this.state.hero, ...payload };
            stateChanged = true;
            break;
        case ACTIONS.SET_GAME_PHASE:
            this.state.game = { ...this.state.game, phase: payload };
            stateChanged = true;
            break;
        case ACTIONS.SET_GAME_ROUND:
            this.state.game = { ...this.state.game, round: payload };
            stateChanged = true;
            break;
        case ACTIONS.SET_DAY_NIGHT:
            this.state.game = { ...this.state.game, isNight: !!payload };
            stateChanged = true;
            break;
        case ACTIONS.SET_COMBAT_STATE:
            this.state.combat = { ...this.state.combat, ...payload };
            stateChanged = true;
            break;
        case ACTIONS.SET_LOADING:
            this.state.ui = { ...this.state.ui, loading: !!payload };
            stateChanged = true;
            break;
        case ACTIONS.SET_LANGUAGE:
            this.state.ui = { ...this.state.ui, language: payload };
            stateChanged = true;
            break;
        default:
            console.warn(`Unknown action dispatched: ${action}`);
        }

        if (stateChanged) {
            this.notify(action);
        }
    }

    /**
     * Notify all listeners of state change
     * @private
     */
    notify(action) {
        this.listeners.forEach(callback => callback(this.state, action));
    }

    /**
     * Helper to get common data
     */
    getHero() { return this.state.hero; }
    getGame() { return this.state.game; }
    getCombat() { return this.state.combat; }
}

// Singleton instance
export const store = new Store();
export default store;
