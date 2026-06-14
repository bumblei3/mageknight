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
} as const;

export type ActionType = keyof typeof ACTIONS;

export interface HeroState {
    name: string;
    level: number;
    fame: number;
    reputation: number;
    armor: number;
    handLimit: number;
    commandLimit: number;
    movementPoints: number;
    attackPoints: number;
    blockPoints: number;
    influencePoints: number;
    healingPoints: number;
    crystals: Record<string, number>;
    tempMana: string[];
    deckSize: number;
    handSize: number;
    discardSize: number;
    wounds: number;
    units: any[];
    skills: any[];
    usedSkills: string[];
}

export interface GameState {
    phase: string;
    round: number;
    isNight: boolean;
    scenario: string;
}

export interface CombatState {
    active: boolean;
    phase: string;
    enemies: any[];
    defeated: any[];
    totalDamage: number;
}

export interface UIState {
    loading: boolean;
    activeModal: string | null;
    language: string;
}

export interface StoreState {
    hero: HeroState;
    game: GameState;
    combat: CombatState;
    ui: UIState;
}

export type StoreListener = (state: StoreState, action?: string) => void;

class Store {
    private state: StoreState;
    private listeners: Set<StoreListener>;

    constructor() {
        this.listeners = new Set();
        // Initialize state before calling notify
        this.state = this.getInitialState();
    }

    private getInitialState(): StoreState {
        return {
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
    }

    /**
     * Resets the store to initial state
     */
    reset(): void {
        this.state = this.getInitialState();
        this.notify();
    }

    /**
     * Clears all listeners (useful for testing)
     */
    clearListeners(): void {
        this.listeners.clear();
    }

    /**
     * Subscribe to state changes
     * @param {StoreListener} callback - Function called with (state, action)
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback: StoreListener): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Dispatches an action to update state
     * @param {string} action - Action type from ACTIONS
     * @param {any} payload - Data to update
     */
    dispatch(action: string, payload: any): void {
        let stateChanged = false;

        switch (action) {
            case ACTIONS.SET_HERO_STATS:
            case ACTIONS.SET_HERO_RESOURCES:
            case ACTIONS.SET_HERO_INVENTORY:
                this.state.hero = { ...this.state.hero, ...(payload as Partial<HeroState>) };
                stateChanged = true;
                break;
            case ACTIONS.SET_GAME_PHASE:
                this.state.game = { ...this.state.game, phase: payload as string };
                stateChanged = true;
                break;
            case ACTIONS.SET_GAME_ROUND:
                this.state.game = { ...this.state.game, round: payload as number };
                stateChanged = true;
                break;
            case ACTIONS.SET_DAY_NIGHT:
                this.state.game = { ...this.state.game, isNight: !!payload };
                stateChanged = true;
                break;
            case ACTIONS.SET_COMBAT_STATE:
                this.state.combat = { ...this.state.combat, ...(payload as Partial<CombatState>) };
                stateChanged = true;
                break;
            case ACTIONS.SET_LOADING:
                this.state.ui = { ...this.state.ui, loading: !!payload };
                stateChanged = true;
                break;
            case ACTIONS.SET_LANGUAGE:
                this.state.ui = { ...this.state.ui, language: payload as string };
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
    private notify(action?: string): void {
        this.listeners.forEach(callback => callback(this.state, action));
    }

    /**
     * Helper to get common data
     */
    getHero(): HeroState { return this.state.hero; }
    getGame(): GameState { return this.state.game; }
    getCombat(): CombatState { return this.state.combat; }
    getState(): StoreState { return this.state; }
}

// Singleton instance
export const store = new Store();
export default store;
