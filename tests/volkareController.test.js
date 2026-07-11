import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VolkareController } from '../js/game/VolkareController.js';
import { eventBus } from '../js/eventBus.js';
import { GAME_EVENTS } from '../js/constants.js';

function makeGame(overrides = {}) {
    return {
        hero: null,
        hexGrid: null,
        ...overrides,
    };
}

describe('VolkareController', () => {
    let game;
    let vc;

    beforeEach(() => {
        eventBus.clear();
        game = makeGame();
        vc = new VolkareController(game);
    });

    afterEach(() => { eventBus.clear(); });

    describe('spawn', () => {
        it('sets position, target, active, level and notifies', () => {
            let updated = null;
            eventBus.on('VOLKARE_UPDATED', (d) => { updated = d; });
            let log = null;
            eventBus.on(GAME_EVENTS.LOG_ADDED, (d) => { log = d; });

            vc.spawn({ q: -3, r: 0 }, { q: 2, r: 0 });

            expect(vc.position).toEqual({ q: -3, r: 0 });
            expect(vc.target).toEqual({ q: 2, r: 0 });
            expect(vc.isActive).toBe(true);
            expect(vc.level).toBe(10);
            expect(updated).not.toBeNull();
            expect(log.message).toContain('Volkare');
        });
    });

    describe('move', () => {
        beforeEach(() => {
            vc.spawn({ q: 0, r: 0 }, { q: 3, r: 0 });
        });

        it('is a no-op when not active', () => {
            vc.isActive = false;
            const logSpy = vi.fn();
            eventBus.on(GAME_EVENTS.LOG_ADDED, logSpy);
            vc.move();
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('is a no-op when no position', () => {
            vc.position = null;
            expect(() => vc.move()).not.toThrow();
        });

        it('is a no-op when no target', () => {
            vc.target = null;
            expect(() => vc.move()).not.toThrow();
        });

        it('is a no-op when no hexGrid', () => {
            game.hexGrid = null;
            expect(() => vc.move()).not.toThrow();
        });

        it('moves one step along the path', () => {
            game.hexGrid = {
                findPath: (from, to) => [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }],
            };
            vc.move();
            expect(vc.position).toEqual({ q: 1, r: 0 });
        });

        it('handles stuck/arrived when path has <=1 node', () => {
            game.hexGrid = { findPath: () => [{ q: 3, r: 0 }] };
            const logSpy = vi.fn();
            eventBus.on(GAME_EVENTS.LOG_ADDED, logSpy);
            vc.move();
            // no "marches to" message; checkWinCondition still runs
            expect(logSpy).not.toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('marches') }));
        });
    });

    describe('checkWinCondition', () => {
        beforeEach(() => {
            vc.spawn({ q: 0, r: 0 }, { q: 3, r: 0 });
        });

        it('emits game-over log when reaching the portal', () => {
            vc.position = { q: 3, r: 0 }; // equals target
            const logs = [];
            eventBus.on(GAME_EVENTS.LOG_ADDED, (d) => logs.push(d));
            vc.checkWinCondition();
            expect(logs.some(l => l.message.includes('Portal'))).toBe(true);
        });

        it('is a no-op without position or target', () => {
            vc.position = null;
            expect(() => vc.checkWinCondition()).not.toThrow();
            vc.position = { q: 0, r: 0 };
            vc.target = null;
            expect(() => vc.checkWinCondition()).not.toThrow();
        });

        it('emits combat event when catching the hero', () => {
            game.hero = { position: { q: 0, r: 0 } };
            vc.position = { q: 0, r: 0 };
            let combat = null;
            eventBus.on('HERO_VOLKARE_COMBAT', (d) => { combat = d; });
            vc.checkWinCondition();
            expect(combat).not.toBeNull();
            expect(combat.volkare).toBe(vc);
        });

        it('does not emit combat when hero not on same hex', () => {
            game.hero = { position: { q: 9, r: 9 } };
            vc.position = { q: 0, r: 0 };
            let combat = null;
            eventBus.on('HERO_VOLKARE_COMBAT', (d) => { combat = d; });
            vc.checkWinCondition();
            expect(combat).toBeNull();
        });

        it('does not emit combat when hero missing', () => {
            game.hero = null;
            vc.position = { q: 0, r: 0 };
            let combat = null;
            eventBus.on('HERO_VOLKARE_COMBAT', (d) => { combat = d; });
            vc.checkWinCondition();
            expect(combat).toBeNull();
        });
    });

    describe('notifyUpdate', () => {
        it('emits VOLKARE_UPDATED with position', () => {
            vc.spawn({ q: 1, r: 1 }, { q: 2, r: 2 });
            let pos = null;
            eventBus.on('VOLKARE_UPDATED', (d) => { pos = d.position; });
            vc.notifyUpdate();
            expect(pos).toEqual({ q: 1, r: 1 });
        });
    });
});
