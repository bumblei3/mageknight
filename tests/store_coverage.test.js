import { describe, it, expect, vi, beforeEach } from 'vitest';
import { store, ACTIONS } from '../js/store.js';

describe('Store - Coverage Boost', () => {
    let unsubscribe;

    beforeEach(() => {
        store.clearListeners();
        store.reset();
        unsubscribe = null;
    });

    afterEach(() => {
        if (unsubscribe) unsubscribe();
        store.clearListeners();
    });

    describe('initial state', () => {
        it('should have correct initial hero state', () => {
            const state = store.getHero();
            
            expect(state.name).toBe('');
            expect(state.level).toBe(1);
            expect(state.fame).toBe(0);
            expect(state.reputation).toBe(0);
            expect(state.armor).toBe(2);
            expect(state.handLimit).toBe(5);
            expect(state.commandLimit).toBe(1);
            expect(state.movementPoints).toBe(0);
            expect(state.attackPoints).toBe(0);
            expect(state.blockPoints).toBe(0);
            expect(state.influencePoints).toBe(0);
            expect(state.healingPoints).toBe(0);
            expect(state.crystals).toEqual({});
            expect(state.tempMana).toEqual([]);
            expect(state.deckSize).toBe(0);
            expect(state.handSize).toBe(0);
            expect(state.discardSize).toBe(0);
            expect(state.wounds).toBe(0);
            expect(state.units).toEqual([]);
            expect(state.skills).toEqual([]);
            expect(state.usedSkills).toEqual([]);
        });

        it('should have correct initial game state', () => {
            const state = store.getGame();
            
            expect(state.phase).toBe('EXPLORATION');
            expect(state.round).toBe(1);
            expect(state.isNight).toBe(false);
            expect(state.scenario).toBe('default');
        });

        it('should have correct initial combat state', () => {
            const state = store.getCombat();
            
            expect(state.active).toBe(false);
            expect(state.phase).toBe('NONE');
            expect(state.enemies).toEqual([]);
            expect(state.defeated).toEqual([]);
            expect(state.totalDamage).toBe(0);
        });

        it('should have correct initial ui state', () => {
            const state = store.getState();
            
            expect(state.ui.loading).toBe(false);
            expect(state.ui.activeModal).toBeNull();
            expect(state.ui.language).toBe('de');
        });
    });

    describe('subscribe', () => {
        it('should return unsubscribe function', () => {
            const callback = vi.fn();
            unsubscribe = store.subscribe(callback);
            
            expect(typeof unsubscribe).toBe('function');
        });

        it('should not call callback after unsubscribe', () => {
            const callback = vi.fn();
            unsubscribe = store.subscribe(callback);
            unsubscribe();
            
            store.dispatch(ACTIONS.SET_HERO_STATS, { fame: 10 });
            
            expect(callback).toHaveBeenCalledTimes(0); // unsubscribed before dispatch, no initial call
        });

        it('should support multiple subscribers', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const unsub1 = store.subscribe(callback1);
            const unsub2 = store.subscribe(callback2);
            
            store.dispatch(ACTIONS.SET_HERO_STATS, { fame: 5 });
            
            expect(callback1).toHaveBeenCalledTimes(1); // called on dispatch + dispatch
            expect(callback2).toHaveBeenCalledTimes(1); // called on dispatch
            
            unsub1();
            unsub2();
        });
    });

    describe('dispatch - hero actions', () => {
        it('should update hero stats', () => {
            store.dispatch(ACTIONS.SET_HERO_STATS, { fame: 100, level: 5 });
            
            const state = store.getHero();
            expect(state.fame).toBe(100);
            expect(state.level).toBe(5);
        });

        it('should update hero resources', () => {
            store.dispatch(ACTIONS.SET_HERO_RESOURCES, { 
                attackPoints: 5, 
                blockPoints: 3,
                movementPoints: 2 
            });
            
            const state = store.getHero();
            expect(state.attackPoints).toBe(5);
            expect(state.blockPoints).toBe(3);
            expect(state.movementPoints).toBe(2);
        });

        it('should update hero inventory', () => {
            store.dispatch(ACTIONS.SET_HERO_INVENTORY, { 
                crystals: { red: 3, blue: 2 },
                tempMana: ['red', 'green']
            });
            
            const state = store.getHero();
            expect(state.crystals).toEqual({ red: 3, blue: 2 });
            expect(state.tempMana).toEqual(['red', 'green']);
        });

        it('should partially update hero state (merge)', () => {
            store.dispatch(ACTIONS.SET_HERO_STATS, { fame: 10 });
            const initialState = store.getHero();
            
            store.dispatch(ACTIONS.SET_HERO_STATS, { reputation: 5 });
            
            const state = store.getHero();
            expect(state.fame).toBe(10); // Preserved
            expect(state.reputation).toBe(5); // Updated
        });

        it('should notify subscribers on hero update', () => {
            const callback = vi.fn();
            unsubscribe = store.subscribe(callback);
            
            store.dispatch(ACTIONS.SET_HERO_STATS, { fame: 1 });
            
            expect(callback).toHaveBeenCalledTimes(1); // called on dispatchset calls notify // initial + dispatch
            expect(callback.mock.calls[0][1]).toBe(ACTIONS.SET_HERO_STATS);
        });
    });

    describe('dispatch - game actions', () => {
        it('should update game phase', () => {
            store.dispatch(ACTIONS.SET_GAME_PHASE, 'COMBAT');
            
            const state = store.getGame();
            expect(state.phase).toBe('COMBAT');
        });

        it('should update game round', () => {
            store.dispatch(ACTIONS.SET_GAME_ROUND, 3);
            
            const state = store.getGame();
            expect(state.round).toBe(3);
        });

        it('should update day/night', () => {
            store.dispatch(ACTIONS.SET_DAY_NIGHT, true);
            
            const state = store.getGame();
            expect(state.isNight).toBe(true);
        });

        it('should convert falsy to false for day/night', () => {
            store.dispatch(ACTIONS.SET_DAY_NIGHT, 0);
            expect(store.getGame().isNight).toBe(false);
            
            store.dispatch(ACTIONS.SET_DAY_NIGHT, null);
            expect(store.getGame().isNight).toBe(false);
            
            store.dispatch(ACTIONS.SET_DAY_NIGHT, undefined);
            expect(store.getGame().isNight).toBe(false);
        });

        it('should notify subscribers on game update', () => {
            const callback = vi.fn();
            unsubscribe = store.subscribe(callback);
            
            store.dispatch(ACTIONS.SET_GAME_ROUND, 2);
            
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][1]).toBe(ACTIONS.SET_GAME_ROUND);
        });
    });

    describe('dispatch - combat actions', () => {
        it('should update combat state', () => {
            store.dispatch(ACTIONS.SET_COMBAT_STATE, { 
                active: true, 
                phase: 'BLOCK',
                totalDamage: 10 
            });
            
            const state = store.getCombat();
            expect(state.active).toBe(true);
            expect(state.phase).toBe('BLOCK');
            expect(state.totalDamage).toBe(10);
        });

        it('should partially update combat state', () => {
            store.dispatch(ACTIONS.SET_COMBAT_STATE, { active: true });
            store.dispatch(ACTIONS.SET_COMBAT_STATE, { enemies: [{ id: 'e1' }] });
            
            const state = store.getCombat();
            expect(state.active).toBe(true);
            expect(state.enemies).toEqual([{ id: 'e1' }]);
        });

        it('should notify subscribers on combat update', () => {
            const callback = vi.fn();
            unsubscribe = store.subscribe(callback);
            
            store.dispatch(ACTIONS.SET_COMBAT_STATE, { active: true });
            
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][1]).toBe(ACTIONS.SET_COMBAT_STATE);
        });
    });

    describe('dispatch - UI actions', () => {
        it('should update loading state', () => {
            store.dispatch(ACTIONS.SET_LOADING, true);
            
            const state = store.getState();
            expect(state.ui.loading).toBe(true);
        });

        it('should convert falsy to false for loading', () => {
            store.dispatch(ACTIONS.SET_LOADING, 0);
            expect(store.getState().ui.loading).toBe(false);
            
            store.dispatch(ACTIONS.SET_LOADING, null);
            expect(store.getState().ui.loading).toBe(false);
        });

        it('should update language', () => {
            store.dispatch(ACTIONS.SET_LANGUAGE, 'en');
            
            const state = store.getState();
            expect(state.ui.language).toBe('en');
        });

        it('should notify subscribers on UI update', () => {
            const callback = vi.fn();
            unsubscribe = store.subscribe(callback);
            
            store.dispatch(ACTIONS.SET_LANGUAGE, 'fr');
            
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][1]).toBe(ACTIONS.SET_LANGUAGE);
        });
    });

    describe('dispatch - unknown action', () => {
        it('should warn for unknown action', () => {
            const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            store.dispatch('UNKNOWN_ACTION', { test: true });
            
            expect(consoleWarn).toHaveBeenCalledWith('Unknown action dispatched: UNKNOWN_ACTION');
            consoleWarn.mockRestore();
        });

        it('should not notify for unknown action', () => {
            const callback = vi.fn();
            unsubscribe = store.subscribe(callback);
            
            store.dispatch('UNKNOWN_ACTION', {});
            
            expect(callback).toHaveBeenCalledTimes(0); // unknown action does not call notify
        });
    });

    describe('reset', () => {
        it('should reset to initial state', () => {
            store.dispatch(ACTIONS.SET_HERO_STATS, { fame: 100, level: 5 });
            store.dispatch(ACTIONS.SET_GAME_PHASE, 'COMBAT');
            store.dispatch(ACTIONS.SET_DAY_NIGHT, true);
            
            store.reset();
            
            const state = store.getState();
            expect(state.hero.fame).toBe(0);
            expect(state.hero.level).toBe(1);
            expect(state.game.phase).toBe('EXPLORATION');
            expect(state.game.isNight).toBe(false);
        });

        it('should notify subscribers on reset', () => {
            const callback = vi.fn();
            unsubscribe = store.subscribe(callback);
            
            store.reset();
            
            expect(callback).toHaveBeenCalledTimes(1); // reset calls notify
        });
    });

    describe('clearListeners', () => {
        it('should clear all listeners', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            store.subscribe(callback1);
            store.subscribe(callback2);
            
            store.clearListeners();
            
            store.dispatch(ACTIONS.SET_HERO_STATS, { fame: 1 });
            
            expect(callback1).toHaveBeenCalledTimes(0); // no calls (subscribe does not call)
            expect(callback2).toHaveBeenCalledTimes(0); // no calls (subscribe does not call)
        });

        it('should allow new listeners after clear', () => {
            const callback1 = vi.fn();
            store.subscribe(callback1);
            store.clearListeners();
            
            const callback2 = vi.fn();
            store.subscribe(callback2);
            
            store.dispatch(ACTIONS.SET_HERO_STATS, { fame: 1 });
            
            expect(callback1).toHaveBeenCalledTimes(0); // subscribe does not call
            expect(callback2).toHaveBeenCalledTimes(1); // called on dispatch
        });
    });

    describe('getState', () => {
        it('should return complete state object', () => {
            const state = store.getState();
            
            expect(state).toHaveProperty('hero');
            expect(state).toHaveProperty('game');
            expect(state).toHaveProperty('combat');
            expect(state).toHaveProperty('ui');
            expect(state.hero).toMatchObject(expect.any(Object));
            expect(state.game).toMatchObject(expect.any(Object));
            expect(state.combat).toMatchObject(expect.any(Object));
            expect(state.ui).toMatchObject(expect.any(Object));
        });

        it('should return same reference across calls', () => {
            const state1 = store.getState();
            const state2 = store.getState();
            
            expect(state1).toBe(state2);
        });
    });

    describe('getters', () => {
        it('getHero should return hero state', () => {
            const hero = store.getHero();
            expect(hero.name).toBe('');
        });

        it('getGame should return game state', () => {
            const game = store.getGame();
            expect(game.phase).toBe('EXPLORATION');
        });

        it('getCombat should return combat state', () => {
            const combat = store.getCombat();
            expect(combat.active).toBe(false);
        });

        it('getState should return full state', () => {
            const state = store.getState();
            expect(state).toHaveProperty('hero');
            expect(state).toHaveProperty('game');
            expect(state).toHaveProperty('combat');
            expect(state).toHaveProperty('ui');
        });
    });

    describe('ACTIONS enum', () => {
        it('should have all expected action types', () => {
            expect(ACTIONS.SET_HERO_STATS).toBe('SET_HERO_STATS');
            expect(ACTIONS.SET_HERO_RESOURCES).toBe('SET_HERO_RESOURCES');
            expect(ACTIONS.SET_HERO_INVENTORY).toBe('SET_HERO_INVENTORY');
            expect(ACTIONS.SET_GAME_PHASE).toBe('SET_GAME_PHASE');
            expect(ACTIONS.SET_GAME_ROUND).toBe('SET_GAME_ROUND');
            expect(ACTIONS.SET_DAY_NIGHT).toBe('SET_DAY_NIGHT');
            expect(ACTIONS.SET_COMBAT_STATE).toBe('SET_COMBAT_STATE');
            expect(ACTIONS.SET_LOADING).toBe('SET_LOADING');
            expect(ACTIONS.SET_LANGUAGE).toBe('SET_LANGUAGE');
        });
    });
});