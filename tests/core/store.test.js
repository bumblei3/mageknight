import { describe, it, expect, beforeEach } from '../testRunner.js';
import { store, ACTIONS } from '../../js/game/Store.js';

describe('Store', () => {
    beforeEach(() => {
        store.reset();
    });

    it('should have initial state', () => {
        const state = store.state;
        expect(state.hero.level).toBe(1);
        expect(state.game.phase).toBe('EXPLORATION');
    });

    it('should update hero stats on dispatch', () => {
        store.dispatch(ACTIONS.SET_HERO_STATS, { fame: 10, level: 2 });
        expect(store.state.hero.fame).toBe(10);
        expect(store.state.hero.level).toBe(2);
    });

    it('should notify listeners on change', () => {
        let called = false;
        let lastAction = null;
        const callback = (state, action) => {
            called = true;
            lastAction = action;
        };
        store.subscribe(callback);

        store.dispatch(ACTIONS.SET_HERO_STATS, { fame: 5 });

        expect(called).toBe(true);
        expect(lastAction).toBe(ACTIONS.SET_HERO_STATS);
        expect(store.state.hero.fame).toBe(5);
    });

    it('should allow multiple parallel subscriptions', () => {
        let count = 0;
        const cb1 = () => count++;
        const cb2 = () => count++;
        store.subscribe(cb1);
        store.subscribe(cb2);

        store.dispatch(ACTIONS.SET_GAME_PHASE, 'COMBAT');

        expect(count).toBe(2);
    });

    it('should unsubscribe correctly', () => {
        let called = false;
        const callback = () => { called = true; };
        const unsubscribe = store.subscribe(callback);

        unsubscribe();
        store.dispatch(ACTIONS.SET_HERO_STATS, { fame: 1 });

        expect(called).toBe(false);
    });
});
