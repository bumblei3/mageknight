import { TIME_OF_DAY, GAME_EVENTS, TimeOfDay } from './constants';
import { eventBus } from './eventBus';
import { store, ACTIONS } from './game/Store';

export { TIME_OF_DAY };

export class TimeManager {
    private round: number = 1;
    private timeOfDay: TimeOfDay = TIME_OF_DAY.DAY;
    private listeners: ((state: { round: number, timeOfDay: TimeOfDay }) => void)[] = [];

    constructor() {
        this.round = 1;
        this.timeOfDay = TIME_OF_DAY.DAY;
        this.listeners = [];
    }

    // Get current movement cost modifier for a terrain type
    public getMovementCostModifier(_terrainType: string): boolean {
        return this.isNight();
    }

    public isDay(): boolean {
        return this.timeOfDay === TIME_OF_DAY.DAY;
    }

    public isNight(): boolean {
        return this.timeOfDay === TIME_OF_DAY.NIGHT;
    }

    public endRound(): { round: number, timeOfDay: TimeOfDay } {
        this.round++;
        this.toggleTime();
        // notifyListeners is called by toggleTime
        return {
            round: this.round,
            timeOfDay: this.timeOfDay
        };
    }

    public toggleTime(): void {
        this.timeOfDay = this.timeOfDay === TIME_OF_DAY.DAY ? TIME_OF_DAY.NIGHT : TIME_OF_DAY.DAY;
        this.notifyListeners();
    }

    public addListener(callback: (state: { round: number, timeOfDay: TimeOfDay }) => void): void {
        this.listeners.push(callback);
    }

    public notifyListeners(): void {
        const state = {
            round: this.round,
            timeOfDay: this.timeOfDay
        };
        this.listeners.forEach(callback => callback(state));
        (eventBus as any).emit(GAME_EVENTS.TIME_CHANGED, state);

        if (store) {
            (store as any).dispatch((ACTIONS as any).SET_GAME_ROUND, this.round);
            (store as any).dispatch((ACTIONS as any).SET_DAY_NIGHT, this.isNight());
        }
    }

    public getState(): { round: number, timeOfDay: TimeOfDay } {
        return {
            round: this.round,
            timeOfDay: this.timeOfDay
        };
    }

    public loadState(state: { round: number, timeOfDay: TimeOfDay }): void {
        this.round = state.round || 1;
        this.timeOfDay = state.timeOfDay || TIME_OF_DAY.DAY;
        this.notifyListeners();
    }
}
