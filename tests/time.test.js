import { describe, it, expect } from 'vitest';
import { TimeManager, TIME_OF_DAY } from '../js/timeManager.js';

describe('TimeManager', () => {
    it('should start at Day 1', () => {
        const time = new TimeManager();
        expect(time.round).toBe(1);
        expect(time.timeOfDay).toBe(TIME_OF_DAY.DAY);
        expect(time.isDay()).toBe(true);
    });

    it('should toggle to Night on endRound', () => {
        const time = new TimeManager();
        time.endRound();
        expect(time.round).toBe(2);
        expect(time.timeOfDay).toBe(TIME_OF_DAY.NIGHT);
        expect(time.isNight()).toBe(true);
    });

    it('should toggle back to Day on next endRound', () => {
        const time = new TimeManager();
        time.endRound(); // Night
        time.endRound(); // Day
        expect(time.round).toBe(3);
        expect(time.timeOfDay).toBe(TIME_OF_DAY.DAY);
    });
    it('should notify listeners on endRound', () => {
        const time = new TimeManager();
        let notified = false;
        let state = null;

        time.addListener((newState) => {
            notified = true;
            state = newState;
        });

        time.endRound();

        expect(notified).toBe(true);
        expect(state.round).toBe(2);
        expect(state.timeOfDay).toBe(TIME_OF_DAY.NIGHT);
    });

    it('should load state correctly', () => {
        const time = new TimeManager();
        const savedState = { round: 5, timeOfDay: TIME_OF_DAY.NIGHT };

        time.loadState(savedState);

        expect(time.round).toBe(5);
        expect(time.isNight()).toBe(true);
    });
});
