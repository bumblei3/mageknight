
export const TIME_OF_DAY = {
    DAY: 'day',
    NIGHT: 'night'
};

export class TimeManager {
    constructor() {
        this.round = 1;
        this.timeOfDay = TIME_OF_DAY.DAY;
        this.listeners = [];
    }

    // Get current movement cost modifier for a terrain type
    getMovementCostModifier(terrainType) {
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
        this.listeners.forEach(callback => callback({
            round: this.round,
            timeOfDay: this.timeOfDay
        }));
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
