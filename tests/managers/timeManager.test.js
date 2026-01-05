import { describe, it, expect } from '../testRunner.js';
import { TIME_OF_DAY, TimeManager } from '../../js/timeManager.js';

describe('TimeManager', () => {
    describe('TIME_OF_DAY Constants', () => {
        it('should define time of day constants', () => {
            expect(TIME_OF_DAY.DAY).toBe('day');
            expect(TIME_OF_DAY.NIGHT).toBe('night');
        });
    });

    describe('Initialization', () => {
        it('should initialize with default values', () => {
            const tm = new TimeManager();

            expect(tm.round).toBe(1);
            expect(tm.timeOfDay).toBe(TIME_OF_DAY.DAY);
            expect(tm.listeners).toBeDefined();
            expect(Array.isArray(tm.listeners)).toBe(true);
        });

        it('should start at day time', () => {
            const tm = new TimeManager();

            expect(tm.isDay()).toBe(true);
            expect(tm.isNight()).toBe(false);
        });
    });

    describe('Time State Checks', () => {
        it('should correctly identify day time', () => {
            const tm = new TimeManager();
            tm.timeOfDay = TIME_OF_DAY.DAY;

            expect(tm.isDay()).toBe(true);
            expect(tm.isNight()).toBe(false);
        });

        it('should correctly identify night time', () => {
            const tm = new TimeManager();
            tm.timeOfDay = TIME_OF_DAY.NIGHT;

            expect(tm.isDay()).toBe(false);
            expect(tm.isNight()).toBe(true);
        });
    });

    describe('toggleTime', () => {
        it('should toggle from day to night', () => {
            const tm = new TimeManager();
            tm.timeOfDay = TIME_OF_DAY.DAY;

            tm.toggleTime();

            expect(tm.timeOfDay).toBe(TIME_OF_DAY.NIGHT);
        });

        it('should toggle from night to day', () => {
            const tm = new TimeManager();
            tm.timeOfDay = TIME_OF_DAY.NIGHT;

            tm.toggleTime();

            expect(tm.timeOfDay).toBe(TIME_OF_DAY.DAY);
        });

        it('should toggle correctly multiple times', () => {
            const tm = new TimeManager();

            expect(tm.timeOfDay).toBe(TIME_OF_DAY.DAY);

            tm.toggleTime(); // Night
            expect(tm.timeOfDay).toBe(TIME_OF_DAY.NIGHT);

            tm.toggleTime(); // Day
            expect(tm.timeOfDay).toBe(TIME_OF_DAY.DAY);

            tm.toggleTime(); // Night
            expect(tm.timeOfDay).toBe(TIME_OF_DAY.NIGHT);
        });
    });

    describe('endRound', () => {
        it('should increment round number', () => {
            const tm = new TimeManager();

            expect(tm.round).toBe(1);

            tm.endRound();

            expect(tm.round).toBe(2);
        });

        it('should toggle time when round ends', () => {
            const tm = new TimeManager();
            const initialTime = tm.timeOfDay;

            tm.endRound();

            expect(tm.timeOfDay).not.toBe(initialTime);
        });

        it('should return new state', () => {
            const tm = new TimeManager();

            const result = tm.endRound();

            expect(result).toBeDefined();
            expect(result.round).toBe(2);
            expect(result.timeOfDay).toBe(TIME_OF_DAY.NIGHT);
        });

        it('should work for multiple rounds', () => {
            const tm = new TimeManager();

            tm.endRound(); // Round 2, Night
            expect(tm.round).toBe(2);
            expect(tm.timeOfDay).toBe(TIME_OF_DAY.NIGHT);

            tm.endRound(); // Round 3, Day
            expect(tm.round).toBe(3);
            expect(tm.timeOfDay).toBe(TIME_OF_DAY.DAY);

            tm.endRound(); // Round 4, Night
            expect(tm.round).toBe(4);
            expect(tm.timeOfDay).toBe(TIME_OF_DAY.NIGHT);
        });
    });

    describe('Listener System', () => {
        it('should allow adding listeners', () => {
            const tm = new TimeManager();
            const listener = () => { };

            tm.addListener(listener);

            expect(tm.listeners.length).toBe(1);
            expect(tm.listeners[0]).toBe(listener);
        });

        it('should notify listeners when round ends', () => {
            const tm = new TimeManager();
            let notified = false;
            let receivedState = null;

            tm.addListener((state) => {
                notified = true;
                receivedState = state;
            });

            tm.endRound();

            expect(notified).toBe(true);
            expect(receivedState).toBeDefined();
            expect(receivedState.round).toBe(2);
            expect(receivedState.timeOfDay).toBe(TIME_OF_DAY.NIGHT);
        });

        it('should notify multiple listeners', () => {
            const tm = new TimeManager();
            let count = 0;

            tm.addListener(() => count++);
            tm.addListener(() => count++);
            tm.addListener(() => count++);

            tm.endRound();

            expect(count).toBe(3);
        });

        it('should call notifyListeners manually', () => {
            const tm = new TimeManager();
            let notified = false;

            tm.addListener(() => notified = true);

            tm.notifyListeners();

            expect(notified).toBe(true);
        });
    });

    describe('State Management', () => {
        it('should return current state', () => {
            const tm = new TimeManager();
            tm.round = 5;
            tm.timeOfDay = TIME_OF_DAY.NIGHT;

            const state = tm.getState();

            expect(state.round).toBe(5);
            expect(state.timeOfDay).toBe(TIME_OF_DAY.NIGHT);
        });

        it('should load state correctly', () => {
            const tm = new TimeManager();

            const savedState = {
                round: 7,
                timeOfDay: TIME_OF_DAY.NIGHT
            };

            tm.loadState(savedState);

            expect(tm.round).toBe(7);
            expect(tm.timeOfDay).toBe(TIME_OF_DAY.NIGHT);
        });

        it('should use defaults when loading partial state', () => {
            const tm = new TimeManager();

            tm.loadState({});

            expect(tm.round).toBe(1);
            expect(tm.timeOfDay).toBe(TIME_OF_DAY.DAY);
        });

        it('should notify listeners when loading state', () => {
            const tm = new TimeManager();
            let notified = false;

            tm.addListener(() => notified = true);

            tm.loadState({ round: 3, timeOfDay: TIME_OF_DAY.NIGHT });

            expect(notified).toBe(true);
        });
    });

    describe('getMovementCostModifier', () => {
        it('should return night status for movement calculation', () => {
            const tm = new TimeManager();

            // Day
            expect(tm.getMovementCostModifier('forest')).toBe(false);

            // Night
            tm.timeOfDay = TIME_OF_DAY.NIGHT;
            expect(tm.getMovementCostModifier('forest')).toBe(true);
        });
    });
});
