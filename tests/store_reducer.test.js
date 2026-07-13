/**
 * Store reducer data-integrity tests (foundation hardening).
 * The reducer merges payloads with no type guard; a non-numeric round
 * dispatched via SET_GAME_ROUND would poison GameState.round (used in
 * round+1 arithmetic elsewhere). We assert the reducer coerces numerics
 * instead of storing raw, corrupt values.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { store, ACTIONS } from '../js/store';

describe('Store reducer — numeric payload integrity', () => {
    beforeEach(() => {
        store.clearListeners();
        store.reset();
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        store.clearListeners();
    });

    it('coerces a string round to a number (no raw string in state)', () => {
        store.dispatch(ACTIONS.SET_GAME_ROUND, 'abc');
        expect(typeof store.getGame().round).toBe('number');
        // NaN/Infinity are not valid rounds either -> clamp to 0
        expect(Number.isFinite(store.getGame().round)).toBe(true);
        expect(store.getGame().round).toBe(0);
    });

    it('keeps a valid numeric round', () => {
        store.dispatch(ACTIONS.SET_GAME_ROUND, 7);
        expect(store.getGame().round).toBe(7);
    });

    it('clamps a negative round to 0', () => {
        store.dispatch(ACTIONS.SET_GAME_ROUND, -3);
        expect(store.getGame().round).toBe(0);
    });

    it('still notifies listeners on a valid round change', () => {
        const seen = [];
        store.subscribe((s, a) => seen.push(a));
        store.dispatch(ACTIONS.SET_GAME_ROUND, 4);
        expect(seen).toContain(ACTIONS.SET_GAME_ROUND);
    });

    it('does not notify on an unknown action (no state change)', () => {
        const seen = [];
        store.subscribe((s, a) => seen.push(a));
        store.dispatch('NOT_A_REAL_ACTION', { foo: 1 });
        expect(seen).toEqual([]);
    });
});

describe('Store reducer — hero numeric payload integrity', () => {
    beforeEach(() => {
        store.clearListeners();
        store.reset();
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        store.clearListeners();
    });

    it('coerces a string movementPoints to a number (no raw string in hero state)', () => {
        store.dispatch(ACTIONS.SET_HERO_RESOURCES, { movementPoints: 'abc' });
        expect(typeof store.getHero().movementPoints).toBe('number');
        expect(store.getHero().movementPoints).toBe(0);
    });

    it('keeps a valid numeric movementPoints', () => {
        store.dispatch(ACTIONS.SET_HERO_RESOURCES, { movementPoints: 2 });
        expect(store.getHero().movementPoints).toBe(2);
    });

    it('clamps a negative movementPoints to 0', () => {
        store.dispatch(ACTIONS.SET_HERO_RESOURCES, { movementPoints: -3 });
        expect(store.getHero().movementPoints).toBe(0);
    });

    it('coerces a string armor to a number', () => {
        store.dispatch(ACTIONS.SET_HERO_STATS, { armor: 'broken' });
        expect(typeof store.getHero().armor).toBe('number');
        expect(store.getHero().armor).toBe(0);
    });

    it('preserves non-numeric fields (name, crystals) passed through untouched', () => {
        store.dispatch(ACTIONS.SET_HERO_STATS, { name: 'Goldyx', fame: 10 });
        expect(store.getHero().name).toBe('Goldyx');
        expect(store.getHero().fame).toBe(10);
        store.dispatch(ACTIONS.SET_HERO_INVENTORY, { crystals: { red: 3 } });
        expect(store.getHero().crystals).toEqual({ red: 3 });
    });
});
