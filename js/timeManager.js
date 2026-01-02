import { TIME_OF_DAY, GAME_EVENTS } from './constants.js';
import { eventBus } from './eventBus.js';

export { TIME_OF_DAY };

export class TimeManager {
    constructor() {
        this.round = 1;
        this.timeOfDay = TIME_OF_DAY.DAY;
        this.listeners = [];
    }

    // Get current movement cost modifier for a terrain type
    getMovementCostModifier(_terrainType) {
        // This will be used by Terrain class, but logic is here or there?
        // Let's keep logic in Terrain class, passing isNight boolean
        return this.isNight();
    }

    isDay() {
        return this.timeOfDay === TIME_OF_DAY.DAY;
    }

    isNight() {
        return this.timeOfDay === TIME_OF_DAY.NIGHT;
    }

    endRound() {
        this.round++;
        this.toggleTime();
        this.notifyListeners();
        return {
            round: this.round,
            timeOfDay: this.timeOfDay
        };
    }

    toggleTime() {
        this.timeOfDay = this.timeOfDay === TIME_OF_DAY.DAY ? TIME_OF_DAY.NIGHT : TIME_OF_DAY.DAY;
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        const state = {
            round: this.round,
            timeOfDay: this.timeOfDay
        };
        this.listeners.forEach(callback => callback(state));
        eventBus.emit(GAME_EVENTS.TIME_CHANGED, state);
    }

    getState() {
        return {
            round: this.round,
            timeOfDay: this.timeOfDay
        };
    }

    loadState(state) {
        this.round = state.round || 1;
        this.timeOfDay = state.timeOfDay || TIME_OF_DAY.DAY;
        this.notifyListeners();
    }
}
