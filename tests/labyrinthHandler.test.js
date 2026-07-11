import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LabyrinthHandler } from '../js/sites/LabyrinthHandler.js';

function makeGame(overrides = {}) {
    return {
        hero: { influencePoints: 5 },
        addLog: vi.fn(),
        combatOrchestrator: { initiateCombat: vi.fn() },
        updateStats: vi.fn(),
        ...overrides,
    };
}

describe('LabyrinthHandler', () => {
    let game;
    let handler;

    beforeEach(() => {
        game = makeGame();
        handler = new LabyrinthHandler(game);
    });

    describe('getOptions', () => {
        it('returns a disabled "cleared" option when conquered', () => {
            const opts = handler.getOptions({ conquered: true });
            expect(opts.length).toBe(1);
            expect(opts[0].id).toBe('cleared');
            expect(opts[0].enabled).toBe(false);
            // Exercise the (no-op) action callback
            expect(() => opts[0].action()).not.toThrow();
        });

        it('returns an enabled "explore" option when not conquered', () => {
            const opts = handler.getOptions({ conquered: false });
            expect(opts.length).toBe(1);
            expect(opts[0].id).toBe('explore_labyrinth');
            expect(opts[0].enabled).toBe(true);
            // Exercise the explore action callback (delegates to exploreLabyrinth)
            opts[0].action();
            expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalled();
        });
    });

    describe('exploreLabyrinth', () => {
        it('creates a mage + dragon pair and initiates combat (random high)', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.9); // both > thresholds
            const r = handler.exploreLabyrinth();
            expect(r.success).toBe(true);
            expect(game.addLog).toHaveBeenCalled();
            expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ type: 'mage' }),
                    expect.objectContaining({ type: 'draconum' }),
                ])
            );
        });

        it('creates a golem + orc pair and initiates combat (random low)', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // both below thresholds
            const r = handler.exploreLabyrinth();
            expect(r.success).toBe(true);
            expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ type: 'golem' }),
                    expect.objectContaining({ type: 'orc_khan' }),
                ])
            );
        });
    });
});
