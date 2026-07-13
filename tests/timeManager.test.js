
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimeManager, TIME_OF_DAY } from '../js/timeManager.ts';
import { eventBus } from '../js/eventBus.ts';
import { GAME_EVENTS } from '../js/constants.ts';

describe('TimeManager', () => {
    let timeManager;

    beforeEach(() => {
        // Clear event bus listeners prevents pollution
        eventBus.clear();
        timeManager = new TimeManager();
    });

    it('should initialize with Round 1, Day', () => {
        const state = timeManager.getState();
        expect(state.round).toBe(1);
        expect(state.timeOfDay).toBe(TIME_OF_DAY.DAY);
    });

    it('should toggle time correctly', () => {
        timeManager.toggleTime();
        expect(timeManager.isNight()).toBe(true);
        expect(timeManager.isDay()).toBe(false);

        timeManager.toggleTime();
        expect(timeManager.isDay()).toBe(true);
    });

    it('should emit GAME_EVENTS.TIME_CHANGED on toggle', () => {
        const spy = vi.spyOn(eventBus, 'emit');
        timeManager.toggleTime();

        expect(spy).toHaveBeenCalledWith(GAME_EVENTS.TIME_CHANGED, {
            round: 1,
            timeOfDay: TIME_OF_DAY.NIGHT
        });
    });

    it('should increment round and toggle time on endRound', () => {
        const result = timeManager.endRound();

        expect(result.round).toBe(2);
        expect(result.timeOfDay).toBe(TIME_OF_DAY.NIGHT);
        expect(timeManager.getState().round).toBe(2);
    });

    it('should notify registered listeners', () => {
        const listener = vi.fn();
        timeManager.addListener(listener);

        timeManager.toggleTime();
        expect(listener).toHaveBeenCalledWith({
            round: 1,
            timeOfDay: TIME_OF_DAY.NIGHT
        });
    });

    describe('loadState — round integrity', () => {
        it('coerces a string round to the 1-based default (no NaN leak)', () => {
            // Rounds are 1-based; a corrupt string must not survive as a raw
            // string (which would make round++ produce NaN downstream).
            timeManager.loadState({ round: 'abc', timeOfDay: TIME_OF_DAY.DAY });
            expect(typeof timeManager.getState().round).toBe('number');
            expect(Number.isFinite(timeManager.getState().round)).toBe(true);
            expect(timeManager.getState().round).toBe(1);
        });

        it('keeps a valid numeric round >= 1', () => {
            timeManager.loadState({ round: 7, timeOfDay: TIME_OF_DAY.DAY });
            expect(timeManager.getState().round).toBe(7);
        });

        it('falls back to the 1 default for a negative round', () => {
            timeManager.loadState({ round: -3, timeOfDay: TIME_OF_DAY.DAY });
            expect(timeManager.getState().round).toBe(1);
        });

        it('falls back to DAY when timeOfDay is missing', () => {
            timeManager.loadState({ round: 4 });
            expect(timeManager.getState().timeOfDay).toBe(TIME_OF_DAY.DAY);
        });
    });
});
